from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import chromadb
from chromadb.utils import embedding_functions
from sentence_transformers import SentenceTransformer

# ----------------------
# FastAPI & CORS
# ----------------------
app = FastAPI()
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------
# Chroma client & collection
# ----------------------
client = chromadb.Client()
collection = client.create_collection(
    name="notes",
    metadata={"description": "Note embeddings"}
)

# ----------------------
# Local embedding model
# ----------------------
model = SentenceTransformer("all-MiniLM-L6-v2")  # completely local, free

def get_embedding(text: str):
    return model.encode(text).tolist()  # convert numpy array to list for Chroma

# ----------------------
# Pydantic model
# ----------------------
class Note(BaseModel):
    id: str 
    title: str
    content: str
    summarizedText: str

# ----------------------
# API routes
# ----------------------
@app.post("/add_note")
def add_note(note: Note):
    embedding = get_embedding(note.content)
    collection.add(
        ids=[note.id],
        embeddings=[embedding],
        metadatas=[{"title": note.title, "summarizedText": note.summarizedText}],
        documents=[note.content]
    )
    return {"status": "success"}

@app.post("/query_related")
def query_related(note: Note, top_k: int = 3):  
    query_emb = get_embedding(note.content)
    results = collection.query(
        query_embeddings=[query_emb],
        n_results=top_k + 1 
    )
    
    # Flatten the nested arrays, excluding the same note if present
    flat_results = []
    for i, doc_id in enumerate(results["ids"][0]):
        if doc_id == note.id:
            continue
        metadata = results["metadatas"][0][i]
        flat_results.append({
            "_id": doc_id,
            "title": metadata.get("title", ""),
            "content": results["documents"][0][i],
            "summarizedText": metadata.get("summarizedText", "")
        })
        if len(flat_results) >= top_k:
            break
    
    return flat_results


@app.get("/all_notes")
def all_notes():
    all_data = collection.get(include=['metadatas', 'documents', 'embeddings'])
    
    # Build a safe preview response
    response = {
        "ids": all_data["ids"],
        "documents": all_data["documents"],
        "metadatas": all_data["metadatas"],
        # just show first 10 values per embedding
        "embeddings": [emb[:10].tolist() for emb in all_data["embeddings"]],
    }
    return response


# delete note 
@app.delete("/delete_note/{note_id}")
def delete_note(note_id: str):
    collection.delete(ids=[note_id])
    return {"status": "success"}
# update note

@app.put("/update_note/{note_id}")
def update_note(note_id: str, note: Note):
    collection.update(ids=[note_id], embeddings=[get_embedding(note.content)], metadatas=[{"title": note.title, "summarizedText": note.summarizedText}], documents=[note.content])
    return {"status": "success"}






