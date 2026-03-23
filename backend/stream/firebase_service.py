# firebase_service.py
from django.conf import settings

def save_document(collection, doc_id, data):
    """Generic function to save data to Firestore"""
    if not hasattr(settings, 'FIREBASE_DB') or not settings.FIREBASE_DB:
        raise ValueError("Firestore client 'FIREBASE_DB' is not initialized in settings.")
    return settings.FIREBASE_DB.collection(collection).document(doc_id).set(data)

def get_all_documents(collection):
    """Generic function to fetch all docs from a collection"""
    if not hasattr(settings, 'FIREBASE_DB') or not settings.FIREBASE_DB:
        raise ValueError("Firestore client 'FIREBASE_DB' is not initialized in settings.")
    docs = settings.FIREBASE_DB.collection(collection).stream()
    return [doc.to_dict() for doc in docs]
