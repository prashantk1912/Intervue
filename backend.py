# backend.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import jwt
import time
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
# Enable CORS for all origins, or specify your frontend origin for production
CORS(app)

# Retrieve Stream API Key and Secret from environment variables
# IMPORTANT: DO NOT hardcode your Stream API Secret here in production.
# Use environment variables as shown.
STREAM_API_KEY = os.getenv("STREAM_API_KEY", "2raj8ju2bgdw") # Your public API Key
STREAM_API_SECRET = os.getenv("STREAM_API_SECRET") # Your Stream API Secret

if not STREAM_API_SECRET:
    print("WARNING: STREAM_API_SECRET environment variable is not set. Token generation will fail.")
    print("Please set STREAM_API_SECRET in your .env file or environment.")

@app.route('/generate_stream_token', methods=['POST'])
def generate_stream_token():
    """
    Generates a Stream Chat/Video user token for a given user ID.
    This endpoint should be protected in a real application (e.g., require authentication).
    """
    data = request.get_json()
    user_id = data.get('userId')

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    if not STREAM_API_SECRET:
        return jsonify({"error": "Stream API Secret not configured on backend"}), 500

    try:
        # Create the JWT payload
        payload = {
            "user_id": user_id,
            "iat": int(time.time()),
            "exp": int(time.time()) + (60 * 60) # Token expires in 1 hour
        }

        # Generate the token using PyJWT
        # The algorithm should match what Stream expects (HS256)
        token = jwt.encode(payload, STREAM_API_SECRET, algorithm="HS256")

        return jsonify({"token": token}), 200

    except Exception as e:
        print(f"Error generating token: {e}")
        return jsonify({"error": "Failed to generate token", "details": str(e)}), 500

@app.route('/')
def health_check():
    return "Stream Token Backend is running!"

if __name__ == '__main__':
    # For local development, run on port 5000 (or any other free port)
    # In production, this would be deployed to a proper server.
    app.run(host='0.0.0.0', port=5000, debug=True)
