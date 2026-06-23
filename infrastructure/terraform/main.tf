# ============================================================
# Adbar Platform — Main Infrastructure
# ============================================================

# ── VPC ───────────────────────────────────────────────────
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = "${var.project_name}-${var.environment}"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "prod"
  one_nat_gateway_per_az = var.environment == "prod"

  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags required for EKS
  public_subnet_tags = {
    "kubernetes.io/role/elb"                      = "1"
    "kubernetes.io/cluster/${var.project_name}-${var.environment}" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"              = "1"
    "kubernetes.io/cluster/${var.project_name}-${var.environment}" = "shared"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# ── EKS Cluster ───────────────────────────────────────────
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.8"

  cluster_name    = "${var.project_name}-${var.environment}"
  cluster_version = var.eks_cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # Cluster addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  # Managed node groups
  eks_managed_node_groups = {
    main = {
      name            = "main"
      instance_types  = var.eks_node_instance_types
      disk_size       = var.eks_node_disk_size

      min_size     = var.eks_node_min_size
      max_size     = var.eks_node_max_size
      desired_size = var.eks_node_desired_size

      labels = {
        role = "general"
      }

      tags = {
        Environment = var.environment
      }
    }
  }

  # Cluster access management
  enable_cluster_creator_admin_permissions = true

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# ── RDS PostgreSQL ────────────────────────────────────────
resource "aws_db_subnet_group" "adbar" {
  name       = "${var.project_name}-${var.environment}-db-subnet"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Name        = "${var.project_name}-${var.environment}-db-subnet"
    Environment = var.environment
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-${var.environment}-rds-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for RDS PostgreSQL"

  ingress {
    description = "PostgreSQL from EKS"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.private_subnet_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-sg"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "adbar" {
  identifier = "${var.project_name}-${var.environment}"

  engine               = "postgres"
  engine_version       = var.rds_engine_version
  instance_class       = var.rds_instance_class
  allocated_storage    = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage

  db_name  = replace(var.project_name, "-", "")
  username = "adbar_admin"
  password = random_password.rds_password.result

  multi_az               = var.rds_multi_az
  db_subnet_group_name   = aws_db_subnet_group.adbar.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = var.rds_backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn

  deletion_protection = var.environment == "prod"
  skip_final_snapshot = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.project_name}-${var.environment}-final" : null

  performance_insights_enabled = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-postgres"
    Environment = var.environment
  }
}

resource "random_password" "rds_password" {
  length  = 32
  special = false
}

resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-kms"
    Environment = var.environment
  }
}

# ── ElastiCache Redis ─────────────────────────────────────
resource "aws_elasticache_subnet_group" "adbar" {
  name       = "${var.project_name}-${var.environment}-cache-subnet"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "elasticache" {
  name_prefix = "${var.project_name}-${var.environment}-cache-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for ElastiCache Redis"

  ingress {
    description = "Redis from EKS"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = var.private_subnet_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-cache-sg"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_elasticache_replication_group" "adbar" {
  replication_group_id = "${var.project_name}-${var.environment}"
  description          = "Redis cluster for Adbar platform"

  node_type            = var.elasticache_node_type
  num_cache_clusters   = var.elasticache_num_cache_nodes
  engine_version       = var.elasticache_engine_version
  port                 = 6379
  parameter_group_name = "default.redis7"

  subnet_group_name  = aws_elasticache_subnet_group.adbar.name
  security_group_ids = [aws_security_group.elasticache.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_password.result

  automatic_failover_enabled = var.environment == "prod"
  multi_az_enabled           = var.environment == "prod"

  snapshot_retention_limit = var.environment == "prod" ? 7 : 1
  snapshot_window          = "04:00-05:00"

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis"
    Environment = var.environment
  }
}

resource "random_password" "redis_password" {
  length  = 32
  special = false
}

# ── S3 Buckets ────────────────────────────────────────────
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.s3_bucket_prefix}-${var.environment}-uploads-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-${var.environment}-uploads"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "assets" {
  bucket = "${var.s3_bucket_prefix}-${var.environment}-assets-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-${var.environment}-assets"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# ── CloudFront Distribution ───────────────────────────────
resource "aws_cloudfront_origin_access_control" "assets" {
  name                              = "${var.project_name}-${var.environment}-assets-oac"
  description                       = "OAC for Adbar assets bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "adbar" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = var.environment == "prod" ? [var.domain_name, "www.${var.domain_name}"] : ["${var.environment}.${var.domain_name}"]
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "S3-${var.project_name}-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.assets.id
  }

  origin {
    domain_name = "REPLACE_WITH_ALB_DNS"
    origin_id   = "ALB-${var.project_name}-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${var.project_name}-assets"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-${var.project_name}-api"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Origin"]
      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = "arn:aws:acm:us-east-1:${data.aws_caller_identity.current.account_id}:certificate/PLACEHOLDER"
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-cdn"
    Environment = var.environment
  }
}

# ── Route 53 ──────────────────────────────────────────────
data "aws_route53_zone" "adbar" {
  name         = var.domain_name
  private_zone = false
}

resource "aws_route53_record" "cloudfront" {
  zone_id = data.aws_route53_zone.adbar.zone_id
  name    = var.environment == "prod" ? var.domain_name : "${var.environment}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.adbar.domain_name
    zone_id                = aws_cloudfront_distribution.adbar.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.adbar.zone_id
  name    = var.environment == "prod" ? var.api_domain_name : "${var.environment}-${var.api_domain_name}"
  type    = "A"

  alias {
    name                   = "REPLACE_WITH_ALB_DNS"
    zone_id                = "REPLACE_WITH_ALB_ZONE_ID"
    evaluate_target_health = true
  }
}

# ── ECR Repositories ──────────────────────────────────────
resource "aws_ecr_repository" "api_gateway" {
  name                 = "${var.project_name}/api-gateway"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "web" {
  name                 = "${var.project_name}/web"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "auth_service" {
  name                 = "${var.project_name}/auth-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "marketplace_service" {
  name                 = "${var.project_name}/marketplace-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "notification_service" {
  name                 = "${var.project_name}/notification-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_ecr_lifecycle_policy" "adbar" {
  for_each = toset([
    aws_ecr_repository.api_gateway.name,
    aws_ecr_repository.web.name,
    aws_ecr_repository.auth_service.name,
    aws_ecr_repository.marketplace_service.name,
    aws_ecr_repository.notification_service.name,
  ])

  repository = each.value

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 30
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
