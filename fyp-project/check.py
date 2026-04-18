from flask import Flask, render_template, request
import joblib
import pandas as pd

app = Flask(__name__)

# Load the dataset
train = pd.read_csv('phishing_url.csv')
lst = train.url.tolist()

# Load the trained model pipeline
model = joblib.load('model.pkl')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if request.method == 'POST':
        url = request.form.get('url')
        
        # Transform and predict using the loaded model
        prediction = model.predict([url])
        
        # Convert prediction to readable format
        result = 1 if prediction[0] == 1 else 2
        
        return render_template('result.html', prediction=result)

if __name__ == '__main__':
    app.run(debug=True)
