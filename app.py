from flask import Flask, jsonify, render_template, request
from exposr.explanations import load_explanations

app = Flask(__name__)

@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=()"
    )
    response.headers["Content-Security-Policy"] = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self'; "
    "img-src 'self' data:; "
    "connect-src 'self'; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "frame-ancestors 'none'; "
    "form-action 'self'"
    )
    return response

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/health")
def health():
    return jsonify(
        status="ok",
        application="Exposr"
    )

@app.route("/api/ip")
def get_ip():
    ip_address = request.remote_addr

    return jsonify({
        "id": "ip_address",
        "source": "server_connection",
        "status": "available" if ip_address else "unavailable",
        "value": ip_address
    })

@app.route("/api/debug-network")
def debug_network():
    return jsonify({
        "remote_addr": request.remote_addr,
        "x_forwarded_for": request.headers.get("X-Forwarded-For"),
        "x_real_ip": request.headers.get("X-Real-IP")
    })

@app.route("/api/headers")
def get_request_headers():
    header_names = [
        "User-Agent",
        "Accept",
        "Accept-Language",
        "Accept-Encoding",
        "DNT",
        "Sec-CH-UA",
        "Sec-CH-UA-Platform",
        "Sec-Fetch-Site"
    ]

    findings = []

    for name in header_names:
        value = request.headers.get(name)

        findings.append({
            "id": "header_" + name.lower().replace("-", "_"),
            "source": "http_request_header",
            "status": "available" if value else "unavailable",
            "value": value
        })

    return jsonify(findings)


@app.route("/api/explanations")
def get_explanations():
    return jsonify(load_explanations())


if __name__ == "__main__":
    app.run(debug=False)
