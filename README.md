# Webpage Mirror

An application to fetch and save webpages along with their assets for offline browsing.

## Installation

1. Clone the repository:
```
git clone https://github.com/dryleaf/webpage-mirror.git
cd webpage-mirror
```

2. Install dependencies:
```
npm install
```

## Usage
Run the application with a URL:
```
node src/fetch https://www.google.com https://autify.com
```

Run with `--metadata` flag:
```
node src/fetch --metadata https://www.google.com
```

## Testing
```
npm test
```

## Run with Docker
**Build image:**
```
docker build -t webpage-mirror .
```

**Run the application:**
```
docker run --rm -it webpage-mirror https://www.google.com https://autify.com
```

### Testing on Docker
```
docker build -f Dockerfile.test -t webpage-mirror-test .
docker run --rm -it webpage-mirror-test
```
