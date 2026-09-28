import os
import hashlib


def get_document_id(pdf_path):
    pdf_name = os.path.basename(pdf_path)

    return hashlib.md5(
        pdf_name.encode()
    ).hexdigest()[:8]


def get_collection_name(pdf_path):
    document_id = get_document_id(pdf_path)

    return f"pdf_{document_id}"