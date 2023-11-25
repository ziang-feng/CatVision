from flask import Flask, request
import json
import pandas
import torch
from catModel import CatAgeANN, CatBreedANN
from urllib.request import Request, urlopen
import cv2
import numpy as np
import math
from PIL import Image
import torchvision.models
import base64
import torch.nn as nn

BREEDS = ['Domestic Short Hair', 'Domestic Long Hair', 'Calico', 'Ragdoll', 'Siamese', 'Russian Blue', 'Bengal', 'Persian']
AGES = ['Adult', 'Baby', 'Young', 'Senior']
SIZE = 300

yolo = torch.hub.load('ultralytics/yolov5', 'yolov5l', pretrained=True, device='cpu', verbose=False)

rw = torchvision.models.ResNet50_Weights.DEFAULT
res50 = torchvision.models.resnet50(weights=rw)
res50.fc = nn.Identity()
res50.eval()

iw = torchvision.models.Inception_V3_Weights.DEFAULT
incep = torch.hub.load('pytorch/vision:v0.10.0', 'inception_v3', weights=iw)
incep.fc = nn.Identity()
incep.eval()

Anet = CatAgeANN()
Anet.load_state_dict(torch.load("A.model"))
Bnet = CatBreedANN()
Bnet.load_state_dict(torch.load("B.model"))

app = Flask(__name__)


@app.route("/", methods=['POST'])
def hello_world():
    # return "<p>Hello, World!</p>"
    payload = request.get_json()
    imgs = []
    excludeMask = []
    for x in payload['links']:
        out = processLink(x)
        if type(out) is not np.ndarray:
            excludeMask.append(1)
            continue
        else:
            imgs.append(out)
            excludeMask.append(0)

    if not len(imgs):
        return {'results':[],'qid':payload['qid']}
    results = yolo(imgs)

    rl = []
    FTIMG = []
    FTtoRL = []

    for i, (l, r) in enumerate(zip(imgs, results.xyxy)):
        img = l
        cats = []
        Y = img.shape[0]
        X = img.shape[1]
        for j, box in enumerate(r.tolist()):
            if int(box[-1]) == 15 and box[-2] >= 0.5:
                cropped = img[math.floor(box[1]):math.ceil(box[3]), math.floor(box[0]):math.ceil(box[2])]
                image = Image.fromarray(cropped)
                if image.width >= SIZE or image.height >= SIZE:
                    image.thumbnail((SIZE, SIZE))
                else:
                    ratio = SIZE / max([image.height, image.width])
                    image = image.resize((int(image.width * ratio), int(image.height * ratio)))
                result = Image.new(image.mode, (SIZE, SIZE), (0, 0, 0))
                result.paste(image, (int((SIZE - image.width) / 2), int((SIZE - image.height) / 2)))
                imgNP = np.array(result)/255
                imgNP = (imgNP-[0.485, 0.456, 0.406])/[0.229, 0.224, 0.225]

                FTIMG.append(imgNP)
                FTtoRL.append([i,j])

                clip = f"polygon({(100*box[0]/X):.2f}% {(100*box[1]/Y):.2f}%,{(100*box[2]/X):.2f}% {(100*box[1]/Y):.2f}%,{(100*box[2]/X):.2f}% {(100*box[3]/Y):.2f}%,{(100*box[0]/X):.2f}% {(100*box[3]/Y):.2f}%)"

                width = box[2]-box[0]
                height = box[3]-box[1]
                top = box[1]
                left = box[0]

                cats.append({'flag':1,'bbox': box[:4], 'age': '', 'breed': '','clip':clip, 'dim':[width,height,left,top,X,Y]})
            else: cats.append({'flag':0})
        rl.append(cats)

    # get features in batch
    s = len(FTIMG)
    if not s:
        return {'results':[],'qid':payload['qid']}
    imgsNP = np.moveaxis(np.stack(FTIMG),-1,1)
    imgTS = torch.tensor(imgsNP).float()

    featuresR = res50(imgTS)
    featuresR = featuresR.detach().numpy()
    featuresR = featuresR.reshape(s,-1)

    featuresI = incep(imgTS)
    featuresI = featuresI.detach().numpy()
    featuresI = featuresI.reshape(s,-1)

    features = np.concatenate((featuresR, featuresI),1)
    features = torch.from_numpy(features)

    sm = torch.nn.Softmax(1)
    Ap = Anet(features).detach().tolist()
    Bp = sm(Bnet(features)).detach().tolist()

    for i,(a,b) in enumerate(zip(Ap,Bp)):
        rl[FTtoRL[i][0]][FTtoRL[i][1]]['age'] = a
        rl[FTtoRL[i][0]][FTtoRL[i][1]]['breed'] = sorted(list(zip(BREEDS, b)), key=lambda x: x[1], reverse=True)
    
    it = iter(rl)
    results = [(next(it) if not m else []) for m in excludeMask]
    return {'results':rl,'qid':payload['qid']}


def processLink(link):
    if link.startswith('http'):
        try:
            req = Request(link)
            req.add_header('User-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/7046A194A')
            req = urlopen(req)
            arr = np.asarray(bytearray(req.read()), dtype=np.uint8)
            img = cv2.imdecode(arr, -1)
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            return img
        except Exception as e:
            return ""
    elif link.startswith('data:image/jpeg;base64'):
        ii = base64.decodebytes(link.split(",")[1].encode())
        jpg_as_np = np.frombuffer(ii, dtype=np.uint8)
        img = cv2.imdecode(jpg_as_np, -1)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return img
    else:
        return ""
