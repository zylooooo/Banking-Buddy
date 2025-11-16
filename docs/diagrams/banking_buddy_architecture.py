from diagrams import Diagram, Cluster, Edge, Node
from diagrams.aws.compute import ElasticBeanstalk, Lambda, EC2Instance
from diagrams.aws.database import RDS, ElastiCache, Dynamodb
from diagrams.aws.network import APIGateway, CloudFront, ELB, NATGateway, InternetGateway
from diagrams.aws.storage import S3, Backup
from diagrams.aws.security import Cognito, WAF, SecretsManager, IAM
from diagrams.aws.integration import SQS, SNS
from diagrams.aws.engagement import SES
from diagrams.aws.management import Cloudwatch, SystemsManager
from diagrams.aws.mobile import Amplify
from diagrams.onprem.client import Users as ClientUsers
from diagrams.aws.compute import EC2Instance as EC2

graph_attr = {
    "fontsize": "10",
    "bgcolor": "white",
    "pad": "2.0",
    "splines": "ortho",
    "nodesep": "2.5",
    "ranksep": "2.5",
    "concentrate": "true",
    "labelloc": "c",
    "labeljust": "c",
    "margin": "1.0"
}

edge_attr = {
    "penwidth": "2.0",
    "color": "black"
}

with Diagram(
    "Banking Buddy - Cloud Architecture",
    filename="banking_buddy_architecture",
    show=False,
    direction="TB",
    graph_attr=graph_attr,
    edge_attr=edge_attr
):
    users = ClientUsers("Users")
    
    with Cluster("Mock Mainframe"):
        sftp_server = EC2("SFTP Server")
        s3_transactions = S3("S3")
    
    with Cluster("AWS Cloud"):
        with Cluster("Service Groups", graph_attr={"style": "invis"}):
            with Cluster("Security Services"):
                waf_display = WAF("WAF")
                amplify_display = Amplify("Amplify")
                asm_display = SystemsManager("ASM")
                iam_display = IAM("IAM")
            
            with Cluster("Monitoring and Alarming Services"):
                cloudwatch_display = Cloudwatch("CloudWatch")
                sns_display = SNS("SNS")
            
            with Cluster("Compute Services"):
                beanstalk_display = ElasticBeanstalk("Beanstalk")
                lambda_display = Lambda("Lambda")
            
            backup_display = Backup("Backup")
        
        with Cluster("Region (ap-southeast-1)"):
            s3_frontend = S3("Frontend\nS3")
            cloudfront = CloudFront("CloudFront")
            ses = SES("Simple Email\nService")
            api_gateway = APIGateway("API\nGateway")
            audit_api = APIGateway("Audit Logs\nAPI Gateway")
            cognito = Cognito("Cognito")
            
            with Cluster("VPC"):
                internet_gw = InternetGateway("Internet\nGateway")
                load_balancer = ELB("Load\nBalancer")
                
                with Cluster("Client Communication Availability Zone", graph_attr={"style": "dashed"}):
                    with Cluster("Public Subnet"):
                        nat_gateway_primary = NATGateway("NAT\nGateway")
                    
                    private_subnet_primary = Cluster("Private Services Subnet")
                    with private_subnet_primary:
                        subnet_to_nat_primary = Node("", shape="point", width="0")
                        subnet_to_db_primary = Node("", shape="point", width="0")
                        
                        eb_container_1 = Cluster("Elastic Beanstalk Container 1")
                        with eb_container_1:
                            user_service_primary = EC2Instance("Users")
                        
                        eb_container_2 = Cluster("Elastic Beanstalk Container 2")
                        with eb_container_2:
                            client_service_primary = EC2Instance("Clients")
                        
                        eb_container_3 = Cluster("Elastic Beanstalk Container 3")
                        with eb_container_3:
                            transaction_service_primary = EC2Instance("Transactions")
                        
                        eb_container_4 = Cluster("Elastic Beanstalk Container 4")
                        with eb_container_4:
                            ai_service_primary = EC2Instance("AI Service")
                    
                    with Cluster("Primary Database Subnet", graph_attr={"margin": "20", "pad": "1.0"}):
                        elasticache_primary = ElastiCache("Account ElastiCache\nClient ElastiCache\nUser ElastiCache\nTransaction ElastiCache")
                        rds_primary = RDS("Account RDS (Primary)\nClient RDS (Primary)\nUser RDS (Primary)\nTransaction RDS (Primary)")
                
                with Cluster("Availability Zone", graph_attr={"style": "dashed"}):
                    with Cluster("Public Subnet"):
                        nat_gateway_standby = NATGateway("NAT\nGateway")
                    
                    private_subnet_standby = Cluster("Private Services Subnet")
                    with private_subnet_standby:
                        subnet_to_nat_standby = Node("", shape="point", width="0")
                        subnet_to_db_standby = Node("", shape="point", width="0")
                        
                        eb_container_1_standby = Cluster("Elastic Beanstalk Container 1")
                        with eb_container_1_standby:
                            user_service_standby = EC2Instance("Users")
                        
                        eb_container_2_standby = Cluster("Elastic Beanstalk Container 2")
                        with eb_container_2_standby:
                            client_service_standby = EC2Instance("Clients")
                        
                        eb_container_3_standby = Cluster("Elastic Beanstalk Container 3")
                        with eb_container_3_standby:
                            transaction_service_standby = EC2Instance("Transactions")
                        
                        eb_container_4_standby = Cluster("Elastic Beanstalk Container 4")
                        with eb_container_4_standby:
                            ai_service_standby = EC2Instance("AI Service")
                    
                    with Cluster("Standby Database Subnet", graph_attr={"margin": "20", "pad": "1.0"}):
                        rds_standby = RDS("Client RDS (Standby)\nUser RDS (Standby)\nAccount RDS (Standby)\nTransaction RDS (Standby)")
            
            lambda_processor = Lambda("Transaction\nProcessor")
            dynamodb_logs = Dynamodb("Log\nDynamoDB")
            log_writer_lambda = Lambda("Log-Writer")
            log_reader_lambda = Lambda("Log-Reader")
            sqs_queue = SQS("SQS")
            sqs_dlq = SQS("SQS")
    
    user_service_standby >> Edge(style="dotted", color="gray20", penwidth="2.0", dir="none") >> user_service_primary
    client_service_standby >> Edge(style="dotted", color="gray20", penwidth="2.0", dir="none") >> client_service_primary
    transaction_service_standby >> Edge(style="dotted", color="gray20", penwidth="2.0", dir="none") >> transaction_service_primary
    ai_service_standby >> Edge(style="dotted", color="gray20", penwidth="2.0", dir="none") >> ai_service_primary
    
    users >> cloudfront
    s3_frontend >> Edge(label="serves\nstatic\nfrontend") >> cloudfront
    cloudfront >> api_gateway
    api_gateway >> internet_gw
    cognito >> api_gateway
    internet_gw >> load_balancer
    nat_gateway_primary >> internet_gw
    nat_gateway_standby >> internet_gw
    
    load_balancer >> user_service_primary
    load_balancer >> client_service_primary
    load_balancer >> transaction_service_primary
    
    subnet_to_nat_primary >> nat_gateway_primary
    subnet_to_db_primary >> rds_primary
    subnet_to_nat_standby >> nat_gateway_standby
    subnet_to_db_standby >> rds_standby
    
    client_service_primary >> ses
    ses >> users
    rds_primary >> Edge(color="red", style="dashed") >> rds_standby
    
    lambda_processor >> Edge(label="Get\nTransaction\ndata") >> sftp_server
    lambda_processor >> rds_primary
    sftp_server >> s3_transactions
    
    user_service_primary >> sqs_queue
    client_service_primary >> sqs_queue
    transaction_service_primary >> sqs_queue
    sqs_queue >> log_writer_lambda
    sqs_queue >> Edge(label="DLQ", style="dotted") >> sqs_dlq
    sqs_queue >> audit_api
    audit_api >> log_reader_lambda
    log_writer_lambda >> dynamodb_logs
    log_reader_lambda >> dynamodb_logs

print(f"Generated: banking_buddy_architecture.png")

