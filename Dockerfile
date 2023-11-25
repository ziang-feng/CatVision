# Define your base image
FROM python:3.8

# Copy current directory content into container
ADD ./backend /backend

WORKDIR /backend

# Update pip
RUN pip install --upgrade pip

RUN apt-get update && apt-get install -y libgl1-mesa-glx

# Install the necessary Python libraries
RUN pip install flask numpy pandas torch torchvision opencv-python-headless pillow

# The Docker container will listen to this port at runtime
EXPOSE 5000

# Run your application
CMD ["flask", "--app", "api", "run","--host=0.0.0.0"]