from re import X
from flask import Flask,render_template,url_for,request
import pandas as pd 


app = Flask(__name__)

train = pd.read_csv('phishing_url.csv')
lst = train.url.tolist()


@app.route('/home')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['GET', 'POST'])
def predict():
    if request.method == 'POST':
        url = request.form.get('url')     
        x = 1 if url in lst else 2  

    return render_template('result.html', prediction=x)


if __name__ == '__main__':
	app.run(debug=True)



    