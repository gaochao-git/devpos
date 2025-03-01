from typing import List, Optional
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pymilvus import MilvusClient
from sentence_transformers import SentenceTransformer

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SearchResult(BaseModel):
    """搜索结果模型"""
    content: str
    db_type: str
    file_path: str
    page: int
    score: float

class SearchRequest(BaseModel):
    query: str
    db_type: str
    scalar_query: Optional[str] = None
    top_k: int = 5

class SearchResponse(BaseModel):
    contexts: List[str]
    query_time_ms: float

class RAGService:
    def __init__(
        self,
        host: str = "82.156.146.51",
        port: str = "19530",
        collection_name: str = "db_docs",
        db_name: str = "nova",
        embedding_model_name: str = "all-MiniLM-L6-v2",
        dim: int = 384,
        search_params: dict = {
            "metric_type": "COSINE",
            "params": {"nprobe": 10}
        }
    ):
        """初始化 RAG 服务"""
        self.collection_name = collection_name
        self.search_params = search_params
        
        logger.info("Starting RAG service initialization...")
        
        try:
            # 使用 MilvusClient
            self.client = MilvusClient(
                uri=f"http://{host}:{port}",
                db_name=db_name
            )
            logger.info(f"Successfully connected to Milvus at {host}:{port}")
            
            # 检查集合是否存在
            collections = self.client.list_collections()
            if collection_name not in collections:
                raise Exception(f"Collection {collection_name} does not exist")
            
            # 加载集合
            self.client.load_collection(collection_name)
            logger.info(f"Collection {collection_name} loaded successfully")
            
            # 初始化 embedding 模型
            logger.info(f"Loading embedding model {embedding_model_name}...")
            self.embedding_model = SentenceTransformer(embedding_model_name)
            logger.info(f"Embedding model {embedding_model_name} loaded successfully")
            
            logger.info("RAG service initialization completed successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize RAG service: {str(e)}")
            raise

    async def get_search_context(
        self,
        vector_query: str,
        db_type: str,
        scalar_query: Optional[str] = None,
        top_k: int = 5
    ) -> List[str]:
        """获取搜索上下文"""
        try:
            # 生成查询向量
            query_vector = self.embedding_model.encode(vector_query).tolist()
            logger.info(f"Generated query vector for: {vector_query}")
            
            # 构建查询条件
            conditions = []
            
            # 添加数据库类型过滤
            if db_type:
                conditions.append(f"db_type == '{db_type}'")
            
            # 添加文本内容过滤
            if scalar_query:
                conditions.append(f'text_content like "%{scalar_query}%"')
            
            # 构建最终的过滤条件
            filter = " && ".join(conditions) if conditions else None
            logger.info(f"Search filter: {filter}")
            
            # 执行向量搜索
            results = self.client.search(
                collection_name=self.collection_name,
                data=[query_vector],
                anns_field="text_embedding",
                search_params=self.search_params,
                limit=top_k,
                filter=filter,
                output_fields=["text_content", "db_type", "file_path", "page_number"]
            )
            # 格式化结果
            contexts = []
            for hits in results:
                for hit in hits:
                    # 从 entity 字段中获取数据
                    content = hit['entity'].get("text_content")
                    file_path = hit['entity'].get("file_path")
                    page = hit['entity'].get("page_number")
                    score = hit.get("distance")
                    citation = f"[来源: {file_path}, 第{page}页]"
                    formatted_content = f"{content}\n{citation}"
                    contexts.append(formatted_content)
            
            return contexts
                
        except Exception as e:
            logger.error(f"Search failed: {str(e)}")
            raise

    def __del__(self):
        """析构函数，确保关闭连接"""
        try:
            if hasattr(self, 'client'):
                self.client.close()
                logger.info("Successfully closed Milvus client")
        except Exception as e:
            logger.error(f"Failed to close Milvus client: {str(e)}")

# 全局 RAG 服务实例
rag_service = None

# 使用 lifespan 上下文管理器替代 on_event
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行
    global rag_service
    try:
        logger.info("Initializing RAG service on startup...")
        rag_service = RAGService()
        logger.info("RAG service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize RAG service: {str(e)}")
    
    yield  # 这里是应用运行的地方
    
    # 关闭时执行
    logger.info("Cleaning up RAG service resources...")
    # RAG 服务的 __del__ 方法会自动调用，但这里可以添加额外的清理逻辑

# 创建 FastAPI 应用，使用 lifespan
app = FastAPI(
    title="RAG API Service",
    description="Vector search API for database documentation",
    version="1.0.0",
    lifespan=lifespan
)

@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """执行向量搜索"""
    global rag_service
    
    # 检查服务是否已初始化
    if not rag_service:
        try:
            logger.info("RAG service not initialized, initializing now...")
            rag_service = RAGService()
        except Exception as e:
            logger.error(f"Failed to initialize RAG service: {str(e)}")
            raise HTTPException(status_code=503, detail="Service unavailable")
    
    try:
        # 记录开始时间
        start_time = time.time()
        
        # 执行搜索
        contexts = await rag_service.get_search_context(
            vector_query=request.query,
            db_type=request.db_type,
            scalar_query=request.scalar_query,
            top_k=request.top_k
        )
        
        # 计算查询时间（毫秒）
        query_time_ms = (time.time() - start_time) * 1000
        
        return SearchResponse(
            contexts=contexts,
            query_time_ms=query_time_ms
        )
    
    except Exception as e:
        logger.error(f"Search API error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """健康检查接口"""
    global rag_service
    return {
        "status": "healthy",
        "rag_service_initialized": rag_service is not None
    }

# 启动说明
if __name__ == "__main__":
    import uvicorn
    print("Starting RAG API server...")
    print("Run the following command to start the server:")
    print("uvicorn milvus_api:app --host 0.0.0.0 --port 8003 --reload")
    
    # 或者直接启动
    uvicorn.run(app, host="0.0.0.0", port=8003) 