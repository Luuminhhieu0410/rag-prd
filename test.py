from langchain_docling import DoclingLoader

FILE_PATH = ["https://pub-9a0bd37de4d64e38a7e731cb7ebff9e0.r2.dev/documents/e27c9681-8f42-408d-b6e8-17a303ead7f4/17d7e6f2-a8c5-47cc-8b6c-61a9765445d8/bc9a30ca-5316-4c74-a930-2041265c5181/raw/DATN%20VU%CC%83%20TUA%CC%82%CC%81N%20MINH.docx"]  # Docling Technical Report

loader = DoclingLoader(file_path=FILE_PATH)

docs = loader.load()
doc = docs[17]

print(doc.page_content)   # nội dung text
print(doc.metadata)       # metadata
print(doc.metadata['source'])  # link file gốc