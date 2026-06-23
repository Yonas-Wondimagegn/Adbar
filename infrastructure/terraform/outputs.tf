# ============================================================
# Adbar Platform — Terraform Outputs
# ============================================================

# ── VPC ───────────────────────────────────────────────────
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnets
}

# ── EKS ───────────────────────────────────────────────────
output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "Endpoint of the EKS cluster"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_certificate_authority" {
  description = "CA certificate data for the EKS cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

# ── RDS ───────────────────────────────────────────────────
output "rds_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = aws_db_instance.adbar.endpoint
}

output "rds_database_name" {
  description = "Name of the database"
  value       = aws_db_instance.adbar.db_name
}

output "rds_username" {
  description = "Username for the database"
  value       = aws_db_instance.adbar.username
}

output "rds_password" {
  description = "Password for the database"
  value       = random_password.rds_password.result
  sensitive   = true
}

# ── ElastiCache ───────────────────────────────────────────
output "redis_endpoint" {
  description = "Endpoint of the Redis cluster"
  value       = aws_elasticache_replication_group.adbar.primary_endpoint_address
}

output "redis_auth_token" {
  description = "Auth token for Redis"
  value       = random_password.redis_password.result
  sensitive   = true
}

# ── S3 ────────────────────────────────────────────────────
output "uploads_bucket_name" {
  description = "Name of the uploads S3 bucket"
  value       = aws_s3_bucket.uploads.bucket
}

output "assets_bucket_name" {
  description = "Name of the assets S3 bucket"
  value       = aws_s3_bucket.assets.bucket
}

# ── CloudFront ────────────────────────────────────────────
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.adbar.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.adbar.domain_name
}

# ── ECR ───────────────────────────────────────────────────
output "ecr_repository_urls" {
  description = "Map of service names to ECR repository URLs"
  value = {
    api-gateway         = aws_ecr_repository.api_gateway.repository_url
    web                 = aws_ecr_repository.web.repository_url
    auth-service        = aws_ecr_repository.auth_service.repository_url
    marketplace-service = aws_ecr_repository.marketplace_service.repository_url
    notification-service = aws_ecr_repository.notification_service.repository_url
  }
}
