#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Hal-Docs AWS Bootstrap Script
# Run this in AWS CloudShell (the >_ icon in the AWS Console top nav).
#
# What it creates (all in us-east-1, ~5 min):
#   - Secrets Manager entries  (DATABASE_URL, RAILS_MASTER_KEY, SECRET_KEY_BASE)
#   - IAM roles                (ecsTaskExecutionRole, hal-docs-task-role)
#   - CloudWatch log groups
#   - Security groups          (alb-public, frontend, api-internal)
#   - Internal ALB             (api) + target group
#   - Public  ALB              (frontend) + target group
#   - ECS cluster              (hal-docs-cluster)
#   - ECS task definitions     (hal-docs-api, hal-docs-frontend)
#   - ECS services             (hal-docs-api, hal-docs-frontend)
#
# Prerequisites (done in the Console before running this script):
#   1. RDS/Aurora Postgres instance running and accessible from this VPC
#   2. ECR images already pushed  (hal-docs-api:latest, hal-docs-frontend:latest)
#   3. An existing VPC with at least 2 public subnets (the default VPC works)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REGION=us-east-1
APP=hal-docs
CLUSTER="${APP}-cluster"

# ── Auto-detect account ID ────────────────────────────────────────────────────
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account: $ACCOUNT_ID  Region: $REGION"

# ── Collect secrets interactively ────────────────────────────────────────────
echo ""
echo "Enter the required secret values (input is hidden):"
read -rsp "  DATABASE_URL (e.g. postgresql://user:pass@host/dbname): " DB_URL     </dev/tty; echo ""
read -rsp "  RAILS_MASTER_KEY: "                                       MASTER_KEY </dev/tty; echo ""
read -rsp "  SECRET_KEY_BASE:  "                                       SKB        </dev/tty; echo ""

# ── Helper: create or update a Secrets Manager secret ────────────────────────
upsert_secret() {
  local name="$1" value="$2"
  if aws secretsmanager describe-secret --secret-id "$name" --region "$REGION" &>/dev/null; then
    aws secretsmanager put-secret-value --secret-id "$name" --secret-string "$value" --region "$REGION" > /dev/null
    echo "  [updated] $name"
  else
    aws secretsmanager create-secret --name "$name" --secret-string "$value" --region "$REGION" > /dev/null
    echo "  [created] $name"
  fi
}

echo ""
echo "==> Storing secrets in Secrets Manager..."
upsert_secret "${APP}/database-url"      "$DB_URL"
upsert_secret "${APP}/rails-master-key"  "$MASTER_KEY"
upsert_secret "${APP}/secret-key-base"   "$SKB"

DB_URL_ARN=$(aws secretsmanager describe-secret --secret-id "${APP}/database-url"     --query ARN --output text --region "$REGION")
MASTER_KEY_ARN=$(aws secretsmanager describe-secret --secret-id "${APP}/rails-master-key" --query ARN --output text --region "$REGION")
SKB_ARN=$(aws secretsmanager describe-secret --secret-id "${APP}/secret-key-base"    --query ARN --output text --region "$REGION")

# ── IAM: ecsTaskExecutionRole ─────────────────────────────────────────────────
echo ""
echo "==> IAM roles..."
if ! aws iam get-role --role-name ecsTaskExecutionRole &>/dev/null; then
  aws iam create-role --role-name ecsTaskExecutionRole \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}' > /dev/null
  aws iam attach-role-policy --role-name ecsTaskExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
  echo "  [created] ecsTaskExecutionRole"
else
  echo "  [exists]  ecsTaskExecutionRole"
fi

# Allow reading the three secrets
EXEC_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/ecsTaskExecutionRole"
aws iam put-role-policy --role-name ecsTaskExecutionRole \
  --policy-name hal-docs-secrets \
  --policy-document "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[{
      \"Effect\":\"Allow\",
      \"Action\":[\"secretsmanager:GetSecretValue\"],
      \"Resource\":[\"${DB_URL_ARN}\",\"${MASTER_KEY_ARN}\",\"${SKB_ARN}\"]
    }]
  }" > /dev/null

# hal-docs-task-role (for S3 Active Storage)
if ! aws iam get-role --role-name hal-docs-task-role &>/dev/null; then
  aws iam create-role --role-name hal-docs-task-role \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}' > /dev/null
  aws iam attach-role-policy --role-name hal-docs-task-role \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
  echo "  [created] hal-docs-task-role"
else
  echo "  [exists]  hal-docs-task-role"
fi
TASK_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/hal-docs-task-role"

# ── CloudWatch log groups ──────────────────────────────────────────────────────
echo ""
echo "==> CloudWatch log groups..."
for lg in /ecs/hal-docs-api /ecs/hal-docs-frontend; do
  aws logs create-log-group --log-group-name "$lg" --region "$REGION" 2>/dev/null && echo "  [created] $lg" || echo "  [exists]  $lg"
  aws logs put-retention-policy --log-group-name "$lg" --retention-in-days 30 --region "$REGION"
done

# ── VPC / Subnets ─────────────────────────────────────────────────────────────
echo ""
echo "==> Networking (default VPC)..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" --output text --region "$REGION")
echo "  VPC: $VPC_ID"

# Pick 2 subnets in different AZs
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=${VPC_ID}" "Name=defaultForAz,Values=true" \
  --query "Subnets[*].SubnetId" --output text --region "$REGION" | tr '\t' ' ')
SUBNET1=$(echo "$SUBNET_IDS" | awk '{print $1}')
SUBNET2=$(echo "$SUBNET_IDS" | awk '{print $2}')
echo "  Subnets: $SUBNET1  $SUBNET2"

# ── Security groups ────────────────────────────────────────────────────────────
echo ""
echo "==> Security groups..."

create_sg() {
  local name="$1" desc="$2"
  local existing
  existing=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=${name}" "Name=vpc-id,Values=${VPC_ID}" \
    --query "SecurityGroups[0].GroupId" --output text --region "$REGION" 2>/dev/null)
  if [ "$existing" = "None" ] || [ -z "$existing" ]; then
    aws ec2 create-security-group --group-name "$name" --description "$desc" \
      --vpc-id "$VPC_ID" --query GroupId --output text --region "$REGION"
  else
    echo "$existing"
  fi
}

SG_ALB=$(create_sg "hal-docs-alb-public"    "hal-docs public ALB");      echo "  ALB sg:      $SG_ALB"
SG_FE=$(create_sg  "hal-docs-frontend"       "hal-docs frontend ECS");    echo "  Frontend sg: $SG_FE"
SG_API=$(create_sg "hal-docs-api"            "hal-docs API ECS");          echo "  API sg:      $SG_API"
SG_ALB_INT=$(create_sg "hal-docs-alb-internal" "hal-docs internal ALB");  echo "  Int ALB sg:  $SG_ALB_INT"

# Rules (idempotent via || true)
aws ec2 authorize-security-group-ingress --group-id "$SG_ALB"     --protocol tcp --port 80  --cidr 0.0.0.0/0        --region "$REGION" 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id "$SG_FE"      --protocol tcp --port 80  --source-group "$SG_ALB"     --region "$REGION" 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id "$SG_ALB_INT" --protocol tcp --port 80  --source-group "$SG_FE"      --region "$REGION" 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id "$SG_API"     --protocol tcp --port 80  --source-group "$SG_ALB_INT" --region "$REGION" 2>/dev/null || true

# ── Internal ALB (API) ────────────────────────────────────────────────────────
echo ""
echo "==> Internal ALB (API)..."
INT_ALB_ARN=$(aws elbv2 describe-load-balancers --names hal-docs-api-internal \
  --query "LoadBalancers[0].LoadBalancerArn" --output text --region "$REGION" 2>/dev/null || true)

if [ -z "$INT_ALB_ARN" ] || [ "$INT_ALB_ARN" = "None" ]; then
  INT_ALB_ARN=$(aws elbv2 create-load-balancer \
    --name hal-docs-api-internal \
    --scheme internal \
    --type application \
    --subnets "$SUBNET1" "$SUBNET2" \
    --security-groups "$SG_ALB_INT" \
    --query "LoadBalancers[0].LoadBalancerArn" --output text --region "$REGION")
  echo "  [created] hal-docs-api-internal"
else
  echo "  [exists]  hal-docs-api-internal"
fi

INT_ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "$INT_ALB_ARN" \
  --query "LoadBalancers[0].DNSName" --output text --region "$REGION")
echo "  DNS: $INT_ALB_DNS"

# Target group for API
API_TG_ARN=$(aws elbv2 describe-target-groups --names hal-docs-api-tg \
  --query "TargetGroups[0].TargetGroupArn" --output text --region "$REGION" 2>/dev/null || true)

if [ -z "$API_TG_ARN" ] || [ "$API_TG_ARN" = "None" ]; then
  API_TG_ARN=$(aws elbv2 create-target-group \
    --name hal-docs-api-tg \
    --protocol HTTP \
    --port 80 \
    --vpc-id "$VPC_ID" \
    --target-type ip \
    --health-check-path /up \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --query "TargetGroups[0].TargetGroupArn" --output text --region "$REGION")
  echo "  [created] target group: hal-docs-api-tg"
else
  echo "  [exists]  target group: hal-docs-api-tg"
fi

# Listener on internal ALB
INT_LISTENER=$(aws elbv2 describe-listeners --load-balancer-arn "$INT_ALB_ARN" \
  --query "Listeners[0].ListenerArn" --output text --region "$REGION" 2>/dev/null || true)
if [ -z "$INT_LISTENER" ] || [ "$INT_LISTENER" = "None" ]; then
  aws elbv2 create-listener \
    --load-balancer-arn "$INT_ALB_ARN" \
    --protocol HTTP --port 80 \
    --default-actions "Type=forward,TargetGroupArn=${API_TG_ARN}" \
    --region "$REGION" > /dev/null
  echo "  [created] listener on internal ALB"
fi

# ── Public ALB (Frontend) ──────────────────────────────────────────────────────
echo ""
echo "==> Public ALB (Frontend)..."
PUB_ALB_ARN=$(aws elbv2 describe-load-balancers --names hal-docs-frontend-public \
  --query "LoadBalancers[0].LoadBalancerArn" --output text --region "$REGION" 2>/dev/null || true)

if [ -z "$PUB_ALB_ARN" ] || [ "$PUB_ALB_ARN" = "None" ]; then
  PUB_ALB_ARN=$(aws elbv2 create-load-balancer \
    --name hal-docs-frontend-public \
    --scheme internet-facing \
    --type application \
    --subnets "$SUBNET1" "$SUBNET2" \
    --security-groups "$SG_ALB" \
    --query "LoadBalancers[0].LoadBalancerArn" --output text --region "$REGION")
  echo "  [created] hal-docs-frontend-public"
else
  echo "  [exists]  hal-docs-frontend-public"
fi

PUB_ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "$PUB_ALB_ARN" \
  --query "LoadBalancers[0].DNSName" --output text --region "$REGION")
echo "  DNS: $PUB_ALB_DNS"

# Target group for frontend
FE_TG_ARN=$(aws elbv2 describe-target-groups --names hal-docs-frontend-tg \
  --query "TargetGroups[0].TargetGroupArn" --output text --region "$REGION" 2>/dev/null || true)

if [ -z "$FE_TG_ARN" ] || [ "$FE_TG_ARN" = "None" ]; then
  FE_TG_ARN=$(aws elbv2 create-target-group \
    --name hal-docs-frontend-tg \
    --protocol HTTP \
    --port 80 \
    --vpc-id "$VPC_ID" \
    --target-type ip \
    --health-check-path / \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --query "TargetGroups[0].TargetGroupArn" --output text --region "$REGION")
  echo "  [created] target group: hal-docs-frontend-tg"
else
  echo "  [exists]  target group: hal-docs-frontend-tg"
fi

# Listener on public ALB
PUB_LISTENER=$(aws elbv2 describe-listeners --load-balancer-arn "$PUB_ALB_ARN" \
  --query "Listeners[0].ListenerArn" --output text --region "$REGION" 2>/dev/null || true)
if [ -z "$PUB_LISTENER" ] || [ "$PUB_LISTENER" = "None" ]; then
  aws elbv2 create-listener \
    --load-balancer-arn "$PUB_ALB_ARN" \
    --protocol HTTP --port 80 \
    --default-actions "Type=forward,TargetGroupArn=${FE_TG_ARN}" \
    --region "$REGION" > /dev/null
  echo "  [created] listener on public ALB"
fi

# ── ECS Cluster ────────────────────────────────────────────────────────────────
echo ""
echo "==> ECS Cluster..."

# Ensure the ECS service-linked role exists (required before creating services)
aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com 2>/dev/null || true

aws ecs create-cluster --cluster-name "$CLUSTER" --region "$REGION" > /dev/null 2>&1 && echo "  [created] $CLUSTER" || echo "  [exists]  $CLUSTER"

# ── Task definitions ───────────────────────────────────────────────────────────
echo ""
echo "==> Registering task definitions..."

API_IMAGE="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/hal-docs-api:latest"
FE_IMAGE="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/hal-docs-frontend:latest"

# API task definition
aws ecs register-task-definition --region "$REGION" --cli-input-json "{
  \"family\": \"hal-docs-api\",
  \"networkMode\": \"awsvpc\",
  \"requiresCompatibilities\": [\"FARGATE\"],
  \"cpu\": \"512\",
  \"memory\": \"1024\",
  \"executionRoleArn\": \"${EXEC_ROLE_ARN}\",
  \"taskRoleArn\": \"${TASK_ROLE_ARN}\",
  \"containerDefinitions\": [{
    \"name\": \"api\",
    \"image\": \"${API_IMAGE}\",
    \"essential\": true,
    \"portMappings\": [{\"containerPort\": 80, \"protocol\": \"tcp\"}],
    \"environment\": [
      {\"name\": \"RAILS_ENV\",       \"value\": \"production\"},
      {\"name\": \"RAILS_LOG_LEVEL\", \"value\": \"info\"},
      {\"name\": \"AWS_REGION\",      \"value\": \"${REGION}\"},
      {\"name\": \"FRONTEND_URL\",    \"value\": \"http://${PUB_ALB_DNS}\"}
    ],
    \"secrets\": [
      {\"name\": \"DATABASE_URL\",    \"valueFrom\": \"${DB_URL_ARN}\"},
      {\"name\": \"RAILS_MASTER_KEY\", \"valueFrom\": \"${MASTER_KEY_ARN}\"},
      {\"name\": \"SECRET_KEY_BASE\",  \"valueFrom\": \"${SKB_ARN}\"}
    ],
    \"logConfiguration\": {
      \"logDriver\": \"awslogs\",
      \"options\": {
        \"awslogs-group\":         \"/ecs/hal-docs-api\",
        \"awslogs-region\":        \"${REGION}\",
        \"awslogs-stream-prefix\": \"api\"
      }
    },
    \"healthCheck\": {
      \"command\":     [\"CMD-SHELL\", \"curl -fsS http://localhost/up || exit 1\"],
      \"interval\":    15,
      \"timeout\":     5,
      \"retries\":     3,
      \"startPeriod\": 30
    }
  }]
}" > /dev/null && echo "  [registered] hal-docs-api"

# Frontend task definition
aws ecs register-task-definition --region "$REGION" --cli-input-json "{
  \"family\": \"hal-docs-frontend\",
  \"networkMode\": \"awsvpc\",
  \"requiresCompatibilities\": [\"FARGATE\"],
  \"cpu\": \"256\",
  \"memory\": \"512\",
  \"executionRoleArn\": \"${EXEC_ROLE_ARN}\",
  \"containerDefinitions\": [{
    \"name\": \"frontend\",
    \"image\": \"${FE_IMAGE}\",
    \"essential\": true,
    \"portMappings\": [{\"containerPort\": 80, \"protocol\": \"tcp\"}],
    \"environment\": [
      {\"name\": \"API_URL\", \"value\": \"http://${INT_ALB_DNS}\"}
    ],
    \"logConfiguration\": {
      \"logDriver\": \"awslogs\",
      \"options\": {
        \"awslogs-group\":         \"/ecs/hal-docs-frontend\",
        \"awslogs-region\":        \"${REGION}\",
        \"awslogs-stream-prefix\": \"frontend\"
      }
    },
    \"healthCheck\": {
      \"command\":     [\"CMD-SHELL\", \"wget -q -O /dev/null http://localhost/ || exit 1\"],
      \"interval\":    15,
      \"timeout\":     5,
      \"retries\":     3,
      \"startPeriod\": 10
    }
  }]
}" > /dev/null && echo "  [registered] hal-docs-frontend"

# ── ECS Services ───────────────────────────────────────────────────────────────
echo ""
echo "==> ECS Services..."

SUBNETS_JSON="[\"${SUBNET1}\",\"${SUBNET2}\"]"

# API service
if aws ecs describe-services --cluster "$CLUSTER" --services hal-docs-api \
    --query "services[0].status" --output text --region "$REGION" 2>/dev/null | grep -qv "INACTIVE\|None"; then
  aws ecs update-service --cluster "$CLUSTER" --service hal-docs-api \
    --task-definition hal-docs-api --region "$REGION" > /dev/null
  echo "  [updated] hal-docs-api service"
else
  aws ecs create-service \
    --cluster "$CLUSTER" \
    --service-name hal-docs-api \
    --task-definition hal-docs-api \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=${SUBNETS_JSON},securityGroups=[\"${SG_API}\"],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=${API_TG_ARN},containerName=api,containerPort=80" \
    --region "$REGION" > /dev/null
  echo "  [created] hal-docs-api service"
fi

# Frontend service
if aws ecs describe-services --cluster "$CLUSTER" --services hal-docs-frontend \
    --query "services[0].status" --output text --region "$REGION" 2>/dev/null | grep -qv "INACTIVE\|None"; then
  aws ecs update-service --cluster "$CLUSTER" --service hal-docs-frontend \
    --task-definition hal-docs-frontend --region "$REGION" > /dev/null
  echo "  [updated] hal-docs-frontend service"
else
  aws ecs create-service \
    --cluster "$CLUSTER" \
    --service-name hal-docs-frontend \
    --task-definition hal-docs-frontend \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=${SUBNETS_JSON},securityGroups=[\"${SG_FE}\"],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=${FE_TG_ARN},containerName=frontend,containerPort=80" \
    --region "$REGION" > /dev/null
  echo "  [created] hal-docs-frontend service"
fi

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Bootstrap complete!"
echo ""
echo "  App URL:  http://${PUB_ALB_DNS}"
echo ""
echo "  ECS tasks take ~2-3 min to start. Check status:"
echo "    https://${REGION}.console.aws.amazon.com/ecs/v2/clusters/${CLUSTER}/services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
