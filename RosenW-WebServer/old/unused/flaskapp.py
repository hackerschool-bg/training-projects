from flask import Flask
from flask import Response
app = Flask('flaskapp')

@app.route('/hello')
def hello_world():
    return Response(
        'Hello world from Flask!\n',
        mimetype='text/plain'
    )

app = app.wsgi_app
