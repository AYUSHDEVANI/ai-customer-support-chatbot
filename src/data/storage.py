import os
from supabase import create_client, Client
from fastapi import UploadFile
from src.config.settings import SUPABASE_URL, SUPABASE_KEY
from src.utils.logger import setup_logger
import shutil

logger = setup_logger()

class StorageClient:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("Supabase credentials not found. Storage will fail.")
            self.client = None
        else:
            try:
                self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
                self.bucket_name = "books"
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                self.client = None

    async def upload_file(self, file: UploadFile, filename: str) -> str:
        """
        Upload a file to Supabase Storage and return its public URL.
        """
        if not self.client:
            raise Exception("Supabase client not initialized")

        try:
            # Read file content
            content = await file.read()
            
            # Upload to Supabase
            # Note: Supabase-py upload expects bytes
            response = self.client.storage.from_(self.bucket_name).upload(
                path=filename,
                file=content,
                file_options={"content-type": "application/pdf", "upsert": "true"}
            )
            
            # Get Public URL
            public_url = self.client.storage.from_(self.bucket_name).get_public_url(filename)
            logger.info(f"File {filename} uploaded to Supabase. URL: {public_url}")
            return public_url

        except Exception as e:
            logger.error(f"Failed to upload file {filename} to Supabase: {e}")
            raise e
        finally:
            await file.seek(0) # Reset file pointer if needed elsewhere

    def delete_file(self, filename: str):
        """
        Delete a file from Supabase Storage.
        """
        if not self.client:
            logger.warning("Supabase client not initialized, skipping delete")
            return

        try:
            self.client.storage.from_(self.bucket_name).remove([filename])
            logger.info(f"File {filename} deleted from Supabase")
        except Exception as e:
            logger.error(f"Failed to delete file {filename} from Supabase: {e}")

    def download_to_temp(self, url: str, filename: str) -> str:
        """
        Download a file from a URL to a temporary local path.
        """
        import requests
        import tempfile
        
        try:
            response = requests.get(url)
            response.raise_for_status()
            
            # Create a temp file
            temp_dir = tempfile.gettempdir()
            temp_path = os.path.join(temp_dir, filename)
            
            with open(temp_path, "wb") as f:
                f.write(response.content)
                
            logger.info(f"Downloaded {filename} to temp path: {temp_path}")
            return temp_path
        except Exception as e:
            logger.error(f"Failed to download file from {url}: {e}")
            raise e

storage_client = StorageClient()
