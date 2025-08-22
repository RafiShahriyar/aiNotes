import os
import httpx
from dotenv import load_dotenv

load_dotenv()
hf_api_key = os.getenv("HF_API_KEY")

if not hf_api_key:
    raise ValueError("HUGGINGFACE_API_KEY not set!")

url = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
headers = {"Authorization": f"Bearer {hf_api_key}"}
payload = {"inputs": "Hello world!"}  # Must use 'inputs' key

response = httpx.post(url, headers=headers, json=payload)

print("Status code:", response.status_code)
print("Response:", response.text)
