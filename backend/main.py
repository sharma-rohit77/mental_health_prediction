import joblib 
from fastapi import FastAPI 
from pydantic import BaseModel, Field
import pandas as pd 
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# ADD THIS BLOCK RIGHT HERE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows any frontend to talk to it
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -----------------------
model = joblib.load('Mental_Health_model.pkl')

top_contries = ['Other',
 'India',
 'USA',
 'Canada',
 'Australia',
 'UK',
 'Germany',
 'Mexico',
 'Turkey',
 'France']


class StudentData(BaseModel):
    Age: int = Field(..., ge=10, le=100)
    
    Gender: Literal['Male', 'Female'] 
    
    Country: str 
    
    Academic_Level: Literal['Undergraduate', 'Graduate', 'High School'] 
    
    Most_Used_Platform: Literal[ 'Facebook',  'LinkedIn', 'Instagram',  'Snapchat',   'Twitter',   'YouTube',
    'TikTok',      'LINE', 'KakaoTalk', 'VKontakte',  'WhatsApp',    'WeChat'] 
    
    Purpose_Of_Use: Literal['Networking', 'Education', 'Entertainment', 'News']
    
    Avg_Daily_Usage_Hours: float = Field(..., ge=0, le=24)
    Daily_Unlocks: int = Field(..., ge=0)
    Study_Hours: float = Field(..., ge=0, le=24)
    Physical_Activity_Hours: float = Field(..., ge=0, le=24)
    Sleep_Hours_Per_Night: float = Field(..., ge=0, le=24)
    
    Stress_Level: Literal['Low', 'Medium', 'High', 'Very High'] 


# Updated Response Class
class PredictionResponse(BaseModel):
    predicted_score: float = Field(..., description="The predicted mental health score")
    status: Literal['Excellent', 'Good', 'Average', 'Bad', 'Very Bad', 'Poor']


@app.get('/')
def greet():
    return "Welcome guys 😊"

@app.post('/predict', response_model=PredictionResponse)
def predict(data : StudentData):

    country_group = data.Country if data.Country in top_contries else "Other"
    input_raw = pd.DataFrame([{
        'Age' : data.Age,
        'Gender' : data.Gender,
        'Country': data.Country,
        'Academic_Level' : data.Academic_Level,
        'Most_Used_Platform' : data.Most_Used_Platform,
        'Purpose_Of_Use': data.Purpose_Of_Use,
        'Avg_Daily_Usage_Hours': data.Avg_Daily_Usage_Hours,
        'Daily_Unlocks' : data.Daily_Unlocks,
        'Study_Hours' : data.Study_Hours,
        'Physical_Activity_Hours' : data.Physical_Activity_Hours,
        'Sleep_Hours_Per_Night' : data.Sleep_Hours_Per_Night,
        'Stress_Level' : data.Stress_Level,
        'Grouped_contry' : country_group
    }])

    prediction = model.predict(input_raw)[0]
    final_score = round(float(prediction), 2)
    
    # Updated logic replacing "Need to Improve" with "Poor"
    if final_score >= 8.5:
        status = "Excellent"
    elif final_score >= 7.5:
        status = "Good"
    elif final_score >= 6.5:
        status = "Average"
    elif final_score >= 5.5:
        status = "Bad"
    elif final_score >= 4.5:
        status = "Very Bad"
    else:
        status = "Poor"
        
    return {
        "predicted_score": final_score,
        "status": status
    }