FROM pathwaycom/pathway:latest
RUN pip install python-dotenv openai
COPY . /app
WORKDIR /app
CMD ["python", "pathway_server.py"]