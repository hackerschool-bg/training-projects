from flask import Flask, render_template

from ft.api import API

app = Flask(__name__)

app.register_blueprint(API, url_prefix='/api')


@app.route('/')
def index():
    return render_template('index.html', fast_tasks=[{'name': 'labyrinth', 'url': "/interactive/labyrinth"}])


@app.route('/interactive/:task_name:')
def interactive(task_name):
    return render_template(task_name + '.html')
