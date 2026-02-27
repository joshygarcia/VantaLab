> ## Documentation Index
> Fetch the complete documentation index at: https://docs.kie.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Veo3.1 API Quickstart

> Get started with Veo3.1 API in 5 minutes

Welcome to Veo3.1 API! This guide will help you quickly get started with our high-quality AI video generation service.

## Overview

Veo3.1 API is a powerful AI video generation platform that supports:

<CardGroup cols={2}>
  <Card title="Text-to-Video" icon="text" href="/veo3-api/generate-veo-3-video">
    Generate high-quality videos through descriptive text prompts
  </Card>

  <Card title="Image-to-Video" icon="image" href="/veo3-api/generate-veo-3-video">
    Bring static images to life, creating engaging videos
  </Card>

  <Card title="HD Support" icon="video" href="/veo3-api/get-veo-3-1080-p-video">
    Support for generating 1080P high-definition videos (16:9 aspect ratio)
  </Card>

  <Card title="Real-time Callbacks" icon="bell" href="/veo3-api/generate-veo-3-video-callbacks">
    Automatically push results to your server when tasks complete
  </Card>
</CardGroup>

## Step 1: Get Your API Key

1. Visit [API Key Management Page](https://kie.ai/api-key)
2. Register or log in to your account
3. Generate a new API Key
4. Safely store your API Key

<Warning>
  Please keep your API Key secure and do not expose it in public code repositories. If you suspect it has been compromised, reset it immediately.
</Warning>

## Step 2: Basic Authentication

All API requests need to include your API Key in the request headers:

```http  theme={null}
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**API Base URL**: `https://api.kie.ai`

## Step 3: Your First Video Generation

### Text-to-Video Example

<CodeGroup>
  ```javascript Node.js theme={null}
  async function generateVideo() {
    try {
      const response = await fetch('https://api.kie.ai/api/v1/veo/generate', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer YOUR_API_KEY',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: "A cute cat playing in a garden on a sunny day, high quality",
          model: "veo3",
          aspect_ratio: "16:9",
          callBackUrl: "https://your-website.com/callback" // Optional
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.code === 200) {
        console.log('Task submitted:', data);
        console.log('Task ID:', data.data.taskId);
        return data.data.taskId;
      } else {
        console.error('Request failed:', data.msg || 'Unknown error');
        return null;
      }
    } catch (error) {
      console.error('Error:', error.message);
      return null;
    }
  }

  generateVideo();
  ```

  ```python Python theme={null}
  import requests
  import json

  def generate_video():
      url = "https://api.kie.ai/api/v1/veo/generate"
      headers = {
          "Authorization": "Bearer YOUR_API_KEY",
          "Content-Type": "application/json"
      }
      
      payload = {
          "prompt": "A cute cat playing in a garden on a sunny day, high quality",
          "model": "veo3",
          "aspect_ratio": "16:9",
          "callBackUrl": "https://your-website.com/callback"  # Optional
      }
      
      try:
          response = requests.post(url, json=payload, headers=headers)
          result = response.json()
          
          if response.ok and result.get('code') == 200:
              print(f"Task submitted: {result}")
              print(f"Task ID: {result['data']['taskId']}")
              return result['data']['taskId']
          else:
              print(f"Request failed: {result.get('msg', 'Unknown error')}")
              return None
      except requests.exceptions.RequestException as e:
          print(f"Error: {e}")
          return None

  generate_video()
  ```

  ```curl cURL theme={null}
  curl -X POST "https://api.kie.ai/api/v1/veo/generate" \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "prompt": "A cute cat playing in a garden on a sunny day, high quality",
      "model": "veo3",
      "aspect_ratio": "16:9",
      "callBackUrl": "https://your-website.com/callback"
    }'
  ```
</CodeGroup>

### Image-to-Video Example

<CodeGroup>
  ```javascript Node.js theme={null}
  const response = await fetch('https://api.kie.ai/api/v1/veo/generate', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: "Make the person in this image wave and smile, with background gently swaying",
      imageUrls: ["https://your-domain.com/image.jpg"],
      model: "veo3",
      aspect_ratio: "16:9"
    })
  });
  ```

  ```python Python theme={null}
  payload = {
      "prompt": "Make the person in this image wave and smile, with background gently swaying",
      "imageUrls": ["https://your-domain.com/image.jpg"],
      "model": "veo3",
      "aspect_ratio": "16:9"
  }

  response = requests.post(url, json=payload, headers=headers)
  ```

  ```curl cURL theme={null}
  curl -X POST "https://api.kie.ai/api/v1/veo/generate" \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "prompt": "Make the person in this image wave and smile, with background gently swaying",
      "imageUrls": ["https://your-domain.com/image.jpg"],
      "model": "veo3",
      "aspect_ratio": "16:9"
    }'
  ```
</CodeGroup>

## Step 4: Check Task Status

Video generation typically takes a few minutes. You can get results through polling or callbacks.

### Polling Method

<CodeGroup>
  ```javascript Node.js theme={null}
  async function checkStatus(taskId) {
    try {
      const response = await fetch(`https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer YOUR_API_KEY'
        }
      });
      
      const result = await response.json();
      
      if (response.ok && result.code === 200) {
        const data = result.data;
        
        switch(data.successFlag) {
          case 0:
            console.log('Generating...');
            break;
          case 1:
            console.log('Generation successful!');
            console.log('Video URLs:', JSON.parse(data.resultUrls));
            return data;
          case 2:
          case 3:
            console.log('Generation failed:', result.msg);
            break;
        }
        
        return null;
      } else {
        console.error('Status check failed:', result.msg || 'Unknown error');
        return null;
      }
    } catch (error) {
      console.error('Status check failed:', error.message);
      return null;
    }
  }

  // Usage example
  async function waitForCompletion(taskId) {
    let result = null;
    while (!result) {
      result = await checkStatus(taskId);
      if (!result) {
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      }
    }
    return result;
  }
  ```

  ```python Python theme={null}
  import time

  def check_status(task_id):
      url = f"https://api.kie.ai/api/v1/veo/record-info?taskId={task_id}"
      headers = {"Authorization": "Bearer YOUR_API_KEY"}
      
      try:
          response = requests.get(url, headers=headers)
          result = response.json()
          
          if response.ok and result.get('code') == 200:
              data = result['data']
              success_flag = data['successFlag']
              
              if success_flag == 0:
                  print("Generating...")
                  return None
              elif success_flag == 1:
                  print("Generation successful!")
                  video_urls = json.loads(data['resultUrls'])
                  print(f"Video URLs: {video_urls}")
                  return data
              else:
                  print(f"Generation failed: {result['msg']}")
                  return False
          else:
              print(f"Status check failed: {result.get('msg', 'Unknown error')}")
              return None
              
      except requests.exceptions.RequestException as e:
          print(f"Status check failed: {e}")
          return None

  def wait_for_completion(task_id):
      while True:
          result = check_status(task_id)
          if result is not None:
              return result
          time.sleep(30)  # Wait 30 seconds
  ```

  ```curl cURL theme={null}
  curl -X GET "https://api.kie.ai/api/v1/veo/record-info?taskId=YOUR_TASK_ID" \
    -H "Authorization: Bearer YOUR_API_KEY"
  ```
</CodeGroup>

### Status Descriptions

| successFlag | Description                                                         |
| ----------- | ------------------------------------------------------------------- |
| 0           | Generating - Task is currently being processed                      |
| 1           | Success - Task completed successfully                               |
| 2           | Failed - Task generation failed                                     |
| 3           | Generation Failed - Task created successfully but generation failed |

## Step 5: Get HD Video (Optional)

If you use 16:9 aspect ratio to generate videos, you can get the 1080P high-definition version:

<CodeGroup>
  ```javascript Node.js theme={null}
  async function get1080pVideo(taskId) {
    try {
      const response = await fetch(`https://api.kie.ai/api/v1/veo/get-1080p-video?taskId=${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer YOUR_API_KEY'
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.code === 200) {
        console.log('1080P video:', data);
        return data;
      } else {
        console.error('Failed to get 1080P video:', data.msg || 'Unknown error');
        return null;
      }
    } catch (error) {
      console.error('Failed to get 1080P video:', error.message);
      return null;
    }
  }
  ```

  ```python Python theme={null}
  def get_1080p_video(task_id):
      url = f"https://api.kie.ai/api/v1/veo/get-1080p-video?taskId={task_id}"
      headers = {"Authorization": "Bearer YOUR_API_KEY"}
      
      try:
          response = requests.get(url, headers=headers)
          result = response.json()
          
          if response.ok and result.get('code') == 200:
              print(f"1080P video: {result}")
              return result
          else:
              print(f"Failed to get 1080P video: {result.get('msg', 'Unknown error')}")
              return None
      except requests.exceptions.RequestException as e:
          print(f"Failed to get 1080P video: {e}")
          return None
  ```

  ```curl cURL theme={null}
  curl -X GET "https://api.kie.ai/api/v1/veo/get-1080p-video?taskId=YOUR_TASK_ID" \
    -H "Authorization: Bearer YOUR_API_KEY"
  ```
</CodeGroup>

<Info>
  **Note**: 1080P video requires additional processing time. It's recommended to wait a few minutes after the original video generation is completed before calling this endpoint.
</Info>

## Callback Handling (Recommended)

Compared to polling, callback mechanism is more efficient. Set the `callBackUrl` parameter, and the system will automatically push results when tasks complete:

<CodeGroup>
  ```javascript Node.js Express theme={null}
  const express = require('express');
  const app = express();

  app.use(express.json());

  app.post('/veo3-1-callback', (req, res) => {
    const { code, msg, data } = req.body;
    
    console.log('Received callback:', {
      taskId: data.taskId,
      status: code,
      message: msg
    });
    
    if (code === 200) {
      // Video generation successful
      const videoUrls = JSON.parse(data.info.resultUrls);
      console.log('Video generation successful:', videoUrls);
      
      // Process the generated videos...
      downloadAndProcessVideos(videoUrls);
    } else {
      console.log('Video generation failed:', msg);
    }
    
    // Return 200 to confirm callback received
    res.status(200).json({ status: 'received' });
  });

  app.listen(3000, () => {
    console.log('Callback server running on port 3000');
  });
  ```

  ```python Python Flask theme={null}
  from flask import Flask, request, jsonify

  app = Flask(__name__)

  @app.route('/veo3-1-callback', methods=['POST'])
  def handle_callback():
      data = request.json
      
      code = data.get('code')
      msg = data.get('msg')
      task_data = data.get('data', {})
      
      print(f"Received callback: {task_data.get('taskId')}, status: {code}")
      
      if code == 200:
          # Video generation successful
          video_urls = json.loads(task_data['info']['resultUrls'])
          print(f"Video generation successful: {video_urls}")
          
          # Process the generated videos...
          download_and_process_videos(video_urls)
      else:
          print(f"Video generation failed: {msg}")
      
      return jsonify({'status': 'received'}), 200

  if __name__ == '__main__':
      app.run(host='0.0.0.0', port=3000)
  ```
</CodeGroup>

## Complete Example: From Generation to Download

<CodeGroup>
  ```javascript Node.js Complete Workflow theme={null}
  const fs = require('fs');
  const https = require('https');

  class Veo31Client {
    constructor(apiKey) {
      this.apiKey = apiKey;
      this.baseUrl = 'https://api.kie.ai';
      this.headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
    }

    // Generate video
    async generateVideo(prompt, options = {}) {
      const payload = {
        prompt,
        model: options.model || 'veo3',
        aspect_ratio: options.aspect_ratio || '16:9',
        ...options
      };

      try {
        const response = await fetch(`${this.baseUrl}/api/v1/veo/generate`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (response.ok && data.code === 200) {
          return data.data.taskId;
        } else {
          throw new Error(`Video generation failed: ${data.msg || 'Unknown error'}`);
        }
      } catch (error) {
        throw new Error(`Video generation failed: ${error.message}`);
      }
    }

    // Check status
    async getStatus(taskId) {
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/veo/record-info?taskId=${taskId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.code === 200) {
          return data.data;
        } else {
          throw new Error(`Status check failed: ${data.msg || 'Unknown error'}`);
        }
      } catch (error) {
        throw new Error(`Status check failed: ${error.message}`);
      }
    }

    // Wait for completion
    async waitForCompletion(taskId, maxWaitTime = 600000) { // Default max wait 10 minutes
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitTime) {
        const status = await this.getStatus(taskId);
        
        console.log(`Task ${taskId} status: ${status.successFlag}`);
        
        if (status.successFlag === 1) {
          return JSON.parse(status.resultUrls);
        } else if (status.successFlag === 2 || status.successFlag === 3) {
          throw new Error('Video generation failed');
        }
        
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      }
      
      throw new Error('Task timeout');
    }

    // Download video
    async downloadVideo(url, filename) {
      return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filename);
        
        https.get(url, (response) => {
          if (response.statusCode === 200) {
            response.pipe(file);
            file.on('finish', () => {
              file.close();
              console.log(`Video downloaded: ${filename}`);
              resolve(filename);
            });
          } else {
            reject(new Error(`Download failed: HTTP ${response.statusCode}`));
          }
        }).on('error', reject);
      });
    }

    // Complete workflow
    async generateAndDownload(prompt, filename = 'video.mp4', options = {}) {
      try {
        console.log('Starting video generation...');
        const taskId = await this.generateVideo(prompt, options);
        console.log(`Task submitted: ${taskId}`);
        
        console.log('Waiting for completion...');
        const videoUrls = await this.waitForCompletion(taskId);
        console.log('Video generation completed!');
        
        console.log('Starting video download...');
        await this.downloadVideo(videoUrls[0], filename);
        
        return { taskId, videoUrls, filename };
      } catch (error) {
        console.error('Error:', error.message);
        throw error;
      }
    }
  }

  // Usage example
  async function main() {
    const client = new Veo31Client('YOUR_API_KEY');
    
    try {
      const result = await client.generateAndDownload(
        'A cute cat playing in a garden on a sunny day, high quality',
        'cute_cat.mp4',
        { aspect_ratio: '16:9' }
      );
      
      console.log('Complete!', result);
    } catch (error) {
      console.error('Generation failed:', error.message);
    }
  }

  main();
  ```
</CodeGroup>

## Best Practices

<CardGroup cols={2}>
  <Card title="Optimize Prompts" icon="lightbulb">
    * Use detailed and specific descriptions
    * Include actions, scenes, and style information
    * Avoid vague or contradictory descriptions
  </Card>

  <Card title="Choose Models Wisely" icon="gear">
    * `veo3`: Quality model, higher quality
    * `veo3_fast`: Fast model, quicker generation
  </Card>

  <Card title="Handle Exceptions" icon="shield">
    * Implement retry mechanisms
    * Handle network and API errors
    * Log errors for debugging
  </Card>

  <Card title="Resource Management" icon="clock">
    * Download and save videos promptly
    * Control concurrent request numbers reasonably
    * Monitor API usage quotas
  </Card>
</CardGroup>

## Frequently Asked Questions

<AccordionGroup>
  <Accordion title="How long does generation take?">
    Typically 2-5 minutes, depending on video complexity and server load. Use `veo3_fast` model for faster generation speed.
  </Accordion>

  <Accordion title="What image formats are supported?">
    Supports common image formats including JPG, PNG, WebP, etc. Ensure image URLs are accessible to the API server.
  </Accordion>

  <Accordion title="How to get better video quality?">
    * Use detailed and specific prompts
    * Choose `veo3` standard model over fast model
    * For 16:9 videos, get 1080P high-definition version
  </Accordion>

  <Accordion title="Do video URLs have expiry dates?">
    Generated video URLs have certain validity periods. It's recommended to download and save them to your storage system promptly.
  </Accordion>

  <Accordion title="How to handle generation failures?">
    * Check if prompts violate content policies
    * Confirm image URLs are accessible
    * Review specific error messages
    * Contact technical support if necessary
  </Accordion>

  <Accordion title="How to generate a Veo 3.1 video longer than 8 seconds?">
    Clips made directly in VEO 3.1 are limited to 8 seconds. Anything longer has been edited externally after export.
  </Accordion>
</AccordionGroup>

## Next Steps

<CardGroup cols={3}>
  <Card title="API Reference" icon="book" href="/veo3-api/generate-veo-3-video">
    View complete API parameters and response formats
  </Card>

  <Card title="Callback Handling" icon="webhook" href="/veo3-api/generate-veo-3-video-callbacks">
    Learn how to handle task completion callbacks
  </Card>

  <Card title="Get Details" icon="video" href="/veo3-api/get-veo-3-video-details">
    Learn how to query task status and results
  </Card>
</CardGroup>

***

If you encounter any issues during usage, please contact our technical support: [support@kie.ai](mailto:support@kie.ai)

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.kie.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Generate Veo 3.1 AI Video(Fast&Quality)

> Create a new video generation task using the Veo3.1 AI model.

<Info>
  Create a new video generation task using the Veo 3.1 API.
</Info>

Our **Veo 3.1 Generation API** is more than a direct wrapper around Google's baseline. It layers extensive optimisation and reliability tooling on top of the official models, giving you greater flexibility and markedly higher success rates — **25% of the official Google pricing** (see [kie.ai/pricing](https://kie.ai/pricing) for full details).

| Capability           | Details                                                                                                                                                                                                                                                                                                                       |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Models**           | • **Veo 3.1 Quality** — flagship model, highest fidelity<br />• **Veo 3.1 Fast** — cost-efficient variant that still delivers strong visual results                                                                                                                                                                           |
| **Tasks**            | • **Text → Video**<br />• **Image → Video** (single reference frame or first and last frames)<br />• **Material → Video** (based on material images)                                                                                                                                                                          |
| **Generation Modes** | • **TEXT\_2\_VIDEO** — Text-to-video: using text prompts only<br />• **FIRST\_AND\_LAST\_FRAMES\_2\_VIDEO** — First and last frames to video: generate transition videos using one or two images<br />• **REFERENCE\_2\_VIDEO** — Material-to-video: based on material images (**Fast model only**, supports **16:9 & 9:16**) |
| **Aspect Ratios**    | Supports both native **16:9** and **9:16** outputs. **Auto** mode lets the system decide aspect ratio based on input materials and internal strategy (for production control, we recommend explicitly setting `aspect_ratio`).                                                                                                |
| **Output Quality**   | Both **16:9** and **9:16** support **1080P** and **4K** outputs. **4K requires extra credits** (approximately **2× the credits of generating a Fast mode video**) and is requested via a separate 4K endpoint.                                                                                                                |
| **Audio Track**      | All videos ship with background audio by default. In rare cases, upstream may suppress audio when the scene is deemed sensitive (e.g. minors).                                                                                                                                                                                |

### Why our Veo 3.1 API is different

1. **True vertical video** – Native Veo 3.1 supports **9:16** output, delivering authentic vertical videos without the need for re-framing or manual editing.
2. **Global language reach** – Our flow supports multilingual prompts by default (no extra configuration required).
3. **Significant cost savings** – Our rates are 25% of Google's direct API pricing.


## OpenAPI

````yaml veo3-api/veo3-api.json post /api/v1/veo/generate
openapi: 3.0.0
info:
  title: Veo3.1 API
  description: kie.ai Veo3.1 API Documentation - Text-to-Video and Image-to-Video API
  version: 1.0.0
  contact:
    name: Technical Support
    email: support@kie.ai
servers:
  - url: https://api.kie.ai
    description: API Server
security:
  - BearerAuth: []
paths:
  /api/v1/veo/generate:
    post:
      summary: Generate Veo3.1 Video
      description: Create a new video generation task using the Veo3.1 AI model.
      operationId: generate-veo3-1-video
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                prompt:
                  type: string
                  description: >-
                    Text prompt describing the desired video content. Required
                    for all generation modes.


                    - Should be detailed and specific in describing video
                    content

                    - Can include actions, scenes, style and other information

                    - For image-to-video, describe how you want the image to
                    come alive
                  example: A dog playing in a park
                imageUrls:
                  type: array
                  items:
                    type: string
                  description: >-
                    Image URL list (used in image-to-video mode). Supports 1 or
                    2 images:


                    - **1 image**: The generated video will unfold around this
                    image, with the image content presented dynamically

                    - **2 images**: The first image serves as the video's first
                    frame, and the second image serves as the video's last
                    frame, with the video transitioning between them

                    - Must be valid image URLs

                    - Images must be accessible to the API server.
                  example:
                    - http://example.com/image1.jpg
                    - http://example.com/image2.jpg
                model:
                  type: string
                  description: >-
                    Select the model type to use.


                    - veo3: Veo 3.1 Quality, supports both text-to-video and
                    image-to-video generation

                    - veo3_fast: Veo3.1 Fast generation model, supports both
                    text-to-video and image-to-video generation
                  enum:
                    - veo3
                    - veo3_fast
                  default: veo3_fast
                  example: veo3_fast
                generationType:
                  type: string
                  description: >-
                    Video generation mode (optional). Specifies different video
                    generation approaches:


                    - **TEXT_2_VIDEO**: Text-to-video - Generate videos using
                    only text prompts

                    - **FIRST_AND_LAST_FRAMES_2_VIDEO**: First and last frames
                    to video - Flexible image-to-video generation mode
                      - 1 image: Generate video based on the provided image
                      - 2 images: First image as first frame, second image as last frame, generating transition video
                    - **REFERENCE_2_VIDEO**: Reference-to-video - Generate
                    videos based on reference images, requires 1-3 images in
                    imageUrls (minimum 1, maximum 3)


                    **Important Notes**:

                    - REFERENCE_2_VIDEO mode currently only supports veo3_fast
                    model and 16:9 aspect ratio

                    - If not specified, the system will automatically determine
                    the generation mode based on whether imageUrls are provided
                  enum:
                    - TEXT_2_VIDEO
                    - FIRST_AND_LAST_FRAMES_2_VIDEO
                    - REFERENCE_2_VIDEO
                  example: TEXT_2_VIDEO
                aspect_ratio:
                  type: string
                  description: >-
                    Video aspect ratio. Specifies the dimension ratio of the
                    generated video. Available options:


                    - 16:9: Landscape video format. 

                    - 9:16: Portrait video format, suitable for mobile short
                    videos

                    - Auto: In auto mode, the video will be automatically
                    center-cropped based on whether your uploaded image is
                    closer to 16:9 or 9:16.


                    Default value is 16:9.
                  enum:
                    - '16:9'
                    - '9:16'
                    - Auto
                  default: '16:9'
                  example: '16:9'
                seeds:
                  type: integer
                  description: >-
                    (Optional) Random seed parameter to control the randomness
                    of the generated content. Value range: 10000-99999. The same
                    seed will generate similar video content, different seeds
                    will generate different content. If not provided, the system
                    will assign one automatically.
                  minimum: 10000
                  maximum: 99999
                  example: 12345
                callBackUrl:
                  type: string
                  description: >-
                    Completion callback URL for receiving video generation
                    status updates.


                    - Optional but recommended for production use

                    - System will POST task completion status to this URL when
                    the video generation is completed

                    - Callback will include task results, video URLs, and status
                    information

                    - Your callback endpoint should accept POST requests with
                    JSON payload

                    - For detailed callback format and implementation guide, see
                    [Callback
                    Documentation](https://docs.kie.ai/veo3-api/generate-veo-3-video-callbacks)

                    - To ensure callback security, see [Webhook Verification
                    Guide](/common-api/webhook-verification) for signature
                    verification implementation

                    - Alternatively, use the Get Video Details endpoint to poll
                    task status
                  example: http://your-callback-url.com/complete
                enableFallback:
                  type: boolean
                  description: >-
                    Deprecated Enable fallback functionality. When set to true,
                    if the official Veo3.1 video generation service is
                    unavailable or encounters exceptions, the system will
                    automatically switch to a backup model for video generation
                    to ensure task continuity and reliability. Default value is
                    false.


                    - When fallback is enabled, backup model will be used for
                    the following errors:
                      - public error minor upload
                      - Your prompt was flagged by Website as violating content policies
                      - public error prominent people upload
                    - Fallback mode requires 16:9 aspect ratio and uses 1080p
                    resolution by default

                    - **Note**: Videos generated through fallback mode cannot be
                    accessed via the Get 1080P Video endpoint

                    - **Credit Consumption**: Successful fallback has different
                    credit consumption, please see https://kie.ai/pricing for
                    pricing details


                    **Note: This parameter is deprecated. Please remove this
                    parameter from your requests. The system has automatically
                    optimized the content review mechanism without requiring
                    manual fallback configuration.**
                  default: false
                  example: false
                  deprecated: true
                enableTranslation:
                  type: boolean
                  description: >-
                    Enable prompt translation to English. When set to true, the
                    system will automatically translate prompts to English
                    before video generation for better generation results.
                    Default value is true.


                    - true: Enable translation, prompts will be automatically
                    translated to English

                    - false: Disable translation, use original prompts directly
                    for generation
                  default: true
                  example: true
                watermark:
                  type: string
                  description: >-
                    Watermark text.


                    - Optional parameter

                    - If provided, a watermark will be added to the generated
                    video
                  example: MyBrand
              required:
                - prompt
              example:
                prompt: A dog playing in a park
                imageUrls:
                  - http://example.com/image1.jpg
                  - http://example.com/image2.jpg
                model: veo3_fast
                watermark: MyBrand
                callBackUrl: http://your-callback-url.com/complete
                aspect_ratio: '16:9'
                seeds: 12345
                enableFallback: false
                enableTranslation: true
                generationType: REFERENCE_2_VIDEO
      responses:
        '200':
          description: Request successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    enum:
                      - 200
                      - 400
                      - 401
                      - 402
                      - 404
                      - 422
                      - 429
                      - 455
                      - 500
                      - 501
                      - 505
                    description: >-
                      Response status code


                      - **200**: Success - Request has been processed
                      successfully

                      - **400**: 1080P is processing. It should be ready in 1-2
                      minutes. Please check back shortly.

                      - **401**: Unauthorized - Authentication credentials are
                      missing or invalid

                      - **402**: Insufficient Credits - Account does not have
                      enough credits to perform the operation

                      - **404**: Not Found - The requested resource or endpoint
                      does not exist

                      - **422**: Validation Error - Request parameters failed
                      validation. When fallback is not enabled and generation
                      fails, error message format: Your request was rejected by
                      Flow(original error message). You may consider using our
                      other fallback channels, which are likely to succeed.
                      Please refer to the documentation.

                      - **429**: Rate Limited - Request limit has been exceeded
                      for this resource

                      - **455**: Service Unavailable - System is currently
                      undergoing maintenance

                      - **500**: Server Error - An unexpected error occurred
                      while processing the request

                      - **501**: Generation Failed - Video generation task
                      failed

                      - **505**: Feature Disabled - The requested feature is
                      currently disabled
                  msg:
                    type: string
                    description: Error message when code != 200
                    example: success
                  data:
                    type: object
                    properties:
                      taskId:
                        type: string
                        description: >-
                          Task ID, can be used with Get Video Details endpoint
                          to query task status
                        example: veo_task_abcdef123456
              example:
                code: 200
                msg: success
                data:
                  taskId: veo_task_abcdef123456
        '500':
          $ref: '#/components/responses/Error'
      callbacks:
        onVideoGenerated:
          '{$request.body#/callBackUrl}':
            post:
              summary: Video Generation Callback
              description: >-
                When the video generation task is completed, the system will
                send the result to your provided callback URL via POST request
              requestBody:
                required: true
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        code:
                          type: integer
                          description: >-
                            Status code


                            - **200**: Success - Video generation task
                            successfully

                            - **400**: Your prompt was flagged by Website as
                            violating content policies.

                            Only English prompts are supported at this time.

                            Failed to fetch the image. Kindly verify any access
                            limits set by you or your service provider.

                            public error unsafe image upload.

                            - **422**: Fallback failed - When fallback is not
                            enabled and specific errors occur, returns error
                            message format: Your request was rejected by
                            Flow(original error message). You may consider using
                            our other fallback channels, which are likely to
                            succeed. Please refer to the documentation.

                            - **500**: Internal Error, Please try again later.

                            Internal Error - Timeout

                            - **501**: Failed - Video generation task failed
                          enum:
                            - 200
                            - 400
                            - 422
                            - 500
                            - 501
                        msg:
                          type: string
                          description: Status message
                          example: Veo3.1 video generated successfully.
                        data:
                          type: object
                          properties:
                            taskId:
                              type: string
                              description: Task ID
                              example: veo_task_abcdef123456
                            info:
                              type: object
                              properties:
                                resultUrls:
                                  type: string
                                  description: Generated video URLs
                                  example: '[http://example.com/video1.mp4]'
                                originUrls:
                                  type: string
                                  description: >-
                                    Original video URLs. Only has value when
                                    aspect_ratio is not 16:9
                                  example: '[http://example.com/original_video1.mp4]'
                                resolution:
                                  type: string
                                  description: Video resolution information
                                  example: 1080p
                            fallbackFlag:
                              type: boolean
                              description: >-
                                Whether generated using fallback model. True
                                means backup model was used, false means primary
                                model was used
                              example: false
                              deprecated: true
              responses:
                '200':
                  description: Callback received successfully
components:
  responses:
    Error:
      description: Server Error
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: API Key
      description: >-
        All APIs require authentication via Bearer Token.


        Get API Key: 

        1. Visit [API Key Management Page](https://kie.ai/api-key) to get your
        API Key


        Usage:

        Add to request header:

        Authorization: Bearer YOUR_API_KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.kie.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Veo3.1 Video Generation Callbacks

> The system will call this callback to notify results when video generation is completed

When you submit a video generation task to the Veo3.1 API, you can set a callback address through the `callBackUrl` parameter. After the task is completed, the system will automatically push the results to your specified address.

## Callback Mechanism Overview

<Info>
  The callback mechanism avoids the need for you to poll the API for task status, as the system will actively push task completion results to your server.
</Info>

<Tip>
  **Webhook Security**: To ensure the authenticity and integrity of callback requests, we strongly recommend implementing webhook signature verification. See our [Webhook Verification Guide](/common-api/webhook-verification) for detailed implementation steps.
</Tip>

### Callback Timing

The system will send callback notifications in the following situations:

* Video generation task completed successfully
* Video generation task failed
* Error occurred during task processing

### Callback Method

* **HTTP Method**: POST
* **Content Type**: application/json
* **Timeout Setting**: 15 seconds

## Callback Request Format

After the task is completed, the system will send a POST request to your `callBackUrl` in the following format:

<CodeGroup>
  ```json Success Callback theme={null}
  {
    "code": 200,
    "msg": "Veo3.1 video generated successfully.",
    "data": {
      "taskId": "veo_task_abcdef123456",
      "info": {
        "resultUrls": ["http://example.com/video1.mp4"],
        "originUrls": ["http://example.com/original_video1.mp4"],
        "resolution": "1080p"
      },
      "promptJson": {
        "aspectRatio":"16:9",
        "callBackUrl":"https://webhook.site/53537b24-e776-4dcc-9bb6-4de9e050bed9",
        "enableFallback":false,
        "enableTranslation":true,
        "model":"veo3_fast",
        "prompt":"A nostalgic song about childhood memories and growing up in a small town"
      },
      "fallbackFlag": false
    }
  }
  ```

  ```json Failure Callback theme={null}
  {
    "code": 400,
    "msg": "Your prompt was flagged by Website as violating content policies.",
    "data": {
      "taskId": "veo_task_abcdef123456",
      "fallbackFlag": false
    }
  }
  ```

  ```json Fallback Failed Callback theme={null}
  {
    "code": 422,
    "msg": "Your request was rejected by Flow(Your prompt was flagged by Website as violating content policies). You may consider using our other fallback channels, which are likely to succeed. Please refer to the documentation.",
    "data": {
      "taskId": "veo_task_abcdef123456",
      "fallbackFlag": false
    }
  }
  ```

  ```json Fallback Success Callback theme={null}
  {
    "code": 200,
    "msg": "Veo3.1 video generated successfully (using fallback model).",
    "data": {
      "taskId": "veo_task_abcdef123456",
      "info": {
        "resultUrls": ["http://example.com/video1.mp4"],
        "resolution": "1080p"
      },
      "fallbackFlag": true
    }
  }
  ```
</CodeGroup>

## Status Code Description

<ParamField path="code" type="integer" required>
  Callback status code indicating task processing result:

  | Status Code | Description                                                                                                                                                                                                                                                                            |
  | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | 200         | Success - Video generation task successfully                                                                                                                                                                                                                                           |
  | 400         | Client error - Prompt violates content policies or other input errors                                                                                                                                                                                                                  |
  | 422         | Fallback failed - When fallback is not enabled and specific errors occur, returns error message format: Your request was rejected by Flow(original error message). You may consider using our other fallback channels, which are likely to succeed. Please refer to the documentation. |
  | 500         | Internal error - Please try again later, internal error or timeout                                                                                                                                                                                                                     |
  | 501         | Failed - Video generation task failed                                                                                                                                                                                                                                                  |
</ParamField>

<ParamField path="msg" type="string" required>
  Status message providing detailed status description. Different status codes correspond to different error messages:

  **400 Status Code Error Messages:**

  * Your prompt was flagged by Website as violating content policies
  * Only English prompts are supported at this time
  * Failed to fetch the image. Kindly verify any access limits set by you or your service provider
  * Public error: unsafe image upload

  **422 Status Code Error Messages:**

  * Your request was rejected by Flow(original error message). You may consider using our other fallback channels, which are likely to succeed. Please refer to the documentation.

  **Fallback Mechanism Description:**
  When `enableFallback` is enabled and the following errors occur, the system will attempt to use the backup model:

  * public error minor upload
  * Your prompt was flagged by Website as violating content policies
  * public error prominent people upload
</ParamField>

<ParamField path="data.taskId" type="string" required>
  Task ID, consistent with the taskId returned when you submitted the task
</ParamField>

<ParamField path="data.info.resultUrls" type="array">
  Generated video URL array (returned only on success)
</ParamField>

<ParamField path="data.info.originUrls" type="array">
  Original video URL array (returned only on success), only has value when aspect\_ratio is not 16:9
</ParamField>

<ParamField path="data.info.resolution" type="string">
  Video resolution information (returned only on success), indicates the resolution of the generated video
</ParamField>

<ParamField path="data.fallbackFlag" type="boolean">
  Whether generated using fallback model. True means backup model was used, false means primary model was used
</ParamField>

## Fallback Functionality Description

<Info>
  The fallback functionality is an intelligent backup generation mechanism. When the primary model encounters specific errors, it automatically switches to a backup model to continue generation, improving task success rates.
</Info>

### Enabling Conditions

The fallback functionality requires the following conditions to be met simultaneously:

1. `enableFallback` parameter is set to `true` in the request
2. Aspect ratio is `16:9`
3. One of the following specific errors occurs:
   * public error minor upload
   * Your prompt was flagged by Website as violating content policies
   * public error prominent people upload

### Fallback Limitations

* **Resolution**: Fallback-generated videos are created in 1080p resolution by default and cannot be accessed via the Get 1080P Video endpoint
* **Image Requirements**: If using image-to-video generation, images must be in 16:9 ratio, otherwise automatic cropping will occur
* **Credit Calculation**: Successful fallback has different credit consumption, please see [https://kie.ai/pricing](https://kie.ai/pricing) for pricing details

### Error Handling

* **Fallback Enabled**: Automatically switch to backup model when specific errors occur, task continues execution
* **Fallback Not Enabled**: Returns 422 status code when specific errors occur, suggesting to enable fallback functionality

<Warning>
  The fallback functionality only takes effect in specific error scenarios. For other types of errors (such as insufficient credits, network issues, etc.), the fallback functionality will not be activated.
</Warning>

## Callback Reception Examples

Here are example codes for receiving callbacks in popular programming languages:

<Tabs>
  <Tab title="Node.js">
    ```javascript  theme={null}
    const express = require('express');
    const fs = require('fs');
    const https = require('https');
    const app = express();

    app.use(express.json());

    app.post('/veo-1-callback', (req, res) => {
      const { code, msg, data } = req.body;
      
      console.log('Received Veo3.1 video generation callback:', {
        taskId: data.taskId,
        status: code,
        message: msg
      });
      
      if (code === 200) {
        // Video generation successful
        const { taskId, info, fallbackFlag } = data;
        const { resultUrls, originUrls, resolution } = info;
        
        console.log('Video generation successful!');
        console.log(`Task ID: ${taskId}`);
        console.log(`Generated video URLs: ${resultUrls}`);
        console.log(`Video resolution: ${resolution}`);
        console.log(`Using fallback model: ${fallbackFlag ? 'Yes' : 'No'}`);
        if (originUrls) {
          console.log(`Original video URLs: ${originUrls}`);
        }
        
        // Download generated video files
        resultUrls.forEach((url, index) => {
          if (url) {
            downloadFile(url, `veo3.1_generated_${taskId}_${index}.mp4`)
              .then(() => console.log(`Video ${index + 1} downloaded successfully`))
              .catch(err => console.error(`Video ${index + 1} download failed:`, err));
          }
        });
        
        // Download original video files (if exists)
        if (originUrls) {
          originUrls.forEach((url, index) => {
            if (url) {
              downloadFile(url, `veo3.1_original_${taskId}_${index}.mp4`)
                .then(() => console.log(`Original video ${index + 1} downloaded successfully`))
                .catch(err => console.error(`Original video ${index + 1} download failed:`, err));
            }
          });
        }
        
      } else {
        // Video generation failed
        console.log('Veo3.1 video generation failed:', msg);
        
        // Handle specific error types
        if (code === 400) {
          console.log('Client error - Check prompts and content policies');
        } else if (code === 422) {
          console.log('Fallback failed - Consider enabling fallback functionality (enableFallback: true)');
        } else if (code === 500) {
          console.log('Server internal error - Please try again later');
        } else if (code === 501) {
          console.log('Task failed - Video generation failed');
        }
      }
      
      // Return 200 status code to confirm callback received
      res.status(200).json({ code: 200, msg: 'success' });
    });

    // Helper function: Download file
    function downloadFile(url, filename) {
      return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filename);
        
        https.get(url, (response) => {
          if (response.statusCode === 200) {
            response.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve();
            });
          } else {
            reject(new Error(`HTTP ${response.statusCode}`));
          }
        }).on('error', reject);
      });
    }

    app.listen(3000, () => {
      console.log('Callback server running on port 3000');
    });
    ```
  </Tab>

  <Tab title="Python">
    ```python  theme={null}
    from flask import Flask, request, jsonify
    import requests
    import json
    import os

    app = Flask(__name__)

    @app.route('/veo3-1-callback', methods=['POST'])
    def handle_callback():
        data = request.json
        
        code = data.get('code')
        msg = data.get('msg')
        callback_data = data.get('data', {})
        task_id = callback_data.get('taskId')
        
        print(f"Received Veo3.1 video generation callback:")
        print(f"Task ID: {task_id}")
        print(f"Status: {code}, Message: {msg}")
        
        if code == 200:
        # Video generation successful
        info = callback_data.get('info', {})
        result_urls = info.get('resultUrls')
        origin_urls = info.get('originUrls')
        resolution = info.get('resolution')
        fallback_flag = callback_data.get('fallbackFlag', False)
        
        print("Video generation successful!")
        print(f"Generated video URLs: {result_urls}")
        print(f"Video resolution: {resolution}")
        print(f"Using fallback model: {'Yes' if fallback_flag else 'No'}")
        if origin_urls:
            print(f"Original video URLs: {origin_urls}")
        
        # Download generated video files
        if result_urls:
            for i, url in enumerate(result_urls):
                if url:
                    try:
                        video_filename = f"veo3.1_generated_{task_id}_{i}.mp4"
                        download_file(url, video_filename)
                        print(f"Video {i + 1} downloaded successfully")
                    except Exception as e:
                        print(f"Video {i + 1} download failed: {e}")
        
        # Download original video files (if exists)
        if origin_urls:
            for i, url in enumerate(origin_urls):
                if url:
                    try:
                        original_filename = f"veo3.1_original_{task_id}_{i}.mp4"
                        download_file(url, original_filename)
                        print(f"Original video {i + 1} downloaded successfully")
                    except Exception as e:
                        print(f"Original video {i + 1} download failed: {e}")

    else:
        # Video generation failed
        print(f"Veo3.1 video generation failed: {msg}")
        
        # Handle specific error types
        if code == 400:
            print("Client error - Check prompts and content policies")
            if 'content policies' in msg:
                print("Content review failed - Please modify prompts")
            elif 'English prompts' in msg:
                print("Language error - Only English prompts are supported")
            elif 'unsafe image' in msg:
                print("Image safety check failed - Please change image")
        elif code == 422:
            print("Fallback failed - Consider enabling fallback functionality (enableFallback: true)")
        elif code == 500:
            print("Server internal error - Please try again later")
        elif code == 501:
            print("Task failed - Video generation failed")
        
        # Return 200 status code to confirm callback received
        return jsonify({'code': 200, 'msg': 'success'}), 200

    def download_file(url, filename):
        """Download file from URL and save to local"""
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        os.makedirs('downloads', exist_ok=True)
        filepath = os.path.join('downloads', filename)
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

    if __name__ == '__main__':
        app.run(host='0.0.0.0', port=3000)
    ```
  </Tab>

  <Tab title="PHP">
    ```php  theme={null}
    <?php
    header('Content-Type: application/json');

    // Get POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    $code = $data['code'] ?? null;
    $msg = $data['msg'] ?? '';
    $callbackData = $data['data'] ?? [];
    $taskId = $callbackData['taskId'] ?? '';

    error_log("Received Veo3.1 video generation callback:");
    error_log("Task ID: $taskId");
    error_log("Status: $code, Message: $msg");

    if ($code === 200) {
        // Video generation successful
        $info = $callbackData['info'] ?? [];
        $resultUrls = $info['resultUrls'] ?? '';
        $originUrls = $info['originUrls'] ?? '';
        $resolution = $info['resolution'] ?? '';
        $fallbackFlag = $callbackData['fallbackFlag'] ?? false;
        
        error_log("Video generation successful!");
        error_log("Generated video URLs: $resultUrls");
        error_log("Video resolution: $resolution");
        error_log("Using fallback model: " . ($fallbackFlag ? 'Yes' : 'No'));
        if (!empty($originUrls)) {
            error_log("Original video URLs: $originUrls");
        }
        
        // Download generated video files
        if (!empty($resultUrls) && is_array($resultUrls)) {
            foreach ($resultUrls as $index => $url) {
                if (!empty($url)) {
                    try {
                        $videoFilename = "veo3.1_generated_{$taskId}_{$index}.mp4";
                        downloadFile($url, $videoFilename);
                        error_log("Video " . ($index + 1) . " downloaded successfully");
                    } catch (Exception $e) {
                        error_log("Video " . ($index + 1) . " download failed: " . $e->getMessage());
                    }
                }
            }
        }
        
        // Download original video files (if exists)
        if (!empty($originUrls) && is_array($originUrls)) {
            foreach ($originUrls as $index => $url) {
                if (!empty($url)) {
                    try {
                        $originalFilename = "veo3.1_original_{$taskId}_{$index}.mp4";
                        downloadFile($url, $originalFilename);
                        error_log("Original video " . ($index + 1) . " downloaded successfully");
                    } catch (Exception $e) {
                        error_log("Original video " . ($index + 1) . " download failed: " . $e->getMessage());
                    }
                }
            }
        }
        
    } else {
        // Video generation failed
        error_log("Veo3.1 video generation failed: $msg");
        
        // Handle specific error types
        if ($code === 400) {
            error_log("Client error - Check prompts and content policies");
            if (strpos($msg, 'content policies') !== false) {
                error_log("Content review failed - Please modify prompts");
            } elseif (strpos($msg, 'English prompts') !== false) {
                error_log("Language error - Only English prompts are supported");
            } elseif (strpos($msg, 'unsafe image') !== false) {
                error_log("Image safety check failed - Please change image");
            }
        } elseif ($code === 422) {
            error_log("Fallback failed - Consider enabling fallback functionality (enableFallback: true)");
        } elseif ($code === 500) {
            error_log("Server internal error - Please try again later");
        } elseif ($code === 501) {
            error_log("Task failed - Video generation failed");
        }
    }

    // Return 200 status code to confirm callback received
    http_response_code(200);
    echo json_encode(['code' => 200, 'msg' => 'success']);

    function downloadFile($url, $filename) {
        $downloadDir = 'downloads';
        if (!is_dir($downloadDir)) {
            mkdir($downloadDir, 0755, true);
        }
        
        $filepath = $downloadDir . '/' . $filename;
        
        $fileContent = file_get_contents($url);
        if ($fileContent === false) {
            throw new Exception("Failed to download file from URL");
        }
        
        $result = file_put_contents($filepath, $fileContent);
        if ($result === false) {
            throw new Exception("Failed to save file locally");
        }
    }
    ?>
    ```
  </Tab>
</Tabs>

## Best Practices

<Tip>
  ### Callback URL Configuration Recommendations

  1. **Use HTTPS**: Ensure callback URL uses HTTPS protocol to guarantee data transmission security
  2. **Verify Source**: Verify the legitimacy of request sources in callback processing
  3. **Idempotent Processing**: The same taskId may receive multiple callbacks, ensure processing logic is idempotent
  4. **Quick Response**: Callback processing should return 200 status code as soon as possible to avoid timeout
  5. **Asynchronous Processing**: Complex business logic should be processed asynchronously to avoid blocking callback response
  6. **Timely Download**: Video URLs have certain validity period, please download and save promptly
  7. **Array Handling**: resultUrls and originUrls are direct array formats that can be iterated directly
  8. **English Prompts**: Ensure using English prompts to avoid language-related errors
</Tip>

<Warning>
  ### Important Reminders

  * Callback URL must be publicly accessible
  * Server must respond within 15 seconds, otherwise it will be considered timeout
  * After 3 consecutive retry failures, the system will stop sending callbacks
  * **Only English prompts are supported**, please ensure prompts use English
  * Please ensure the stability of callback processing logic to avoid callback failures due to exceptions
  * Properly handle content review errors to ensure input content complies with platform policies
  * resultUrls and originUrls return direct array formats that can be iterated directly
  * originUrls only has value when aspect\_ratio is not 16:9
  * Pay attention to image upload security checks to avoid uploading unsafe images
</Warning>

## Troubleshooting

If you don't receive callback notifications, please check the following:

<AccordionGroup>
  <Accordion title="Network Connection Issues">
    * Confirm callback URL is accessible from public network
    * Check firewall settings to ensure inbound requests are not blocked
    * Verify domain name resolution is correct
  </Accordion>

  <Accordion title="Server Response Issues">
    * Ensure server returns HTTP 200 status code within 15 seconds
    * Check error information in server logs
    * Verify interface path and HTTP method are correct
  </Accordion>

  <Accordion title="Content Format Issues">
    * Confirm received POST request body is JSON format
    * Check if Content-Type is application/json
    * Verify JSON parsing is correct
    * Correctly handle resultUrls and originUrls array formats
  </Accordion>

  <Accordion title="Video Processing Issues">
    * Confirm video URLs are accessible
    * Check video download permissions and network connection
    * Verify video save path and permissions
    * Pay attention to video URL validity period limitations
    * Backup videos to long-term storage system promptly
  </Accordion>

  <Accordion title="Content Review Issues">
    * Review content review error messages
    * Ensure prompts use English
    * Ensure input images don't contain inappropriate content
    * Check if prompts comply with platform content policies
    * Avoid using sensitive or violating descriptive words
    * Ensure image uploads are safe and in correct format
  </Accordion>

  <Accordion title="Generation Quality Issues">
    * Check generated video quality and resolution
    * Verify video duration meets expectations
    * Evaluate generated video quality and style
    * Ensure video content meets expectations
    * If originUrls exist, compare differences between original and generated videos
  </Accordion>
</AccordionGroup>

## Veo3.1 Specific Notes

<Note>
  ### Veo3.1 Video Generation Features

  Veo3.1 AI video generation functionality has the following characteristics:

  1. **High-Quality Generation**: Veo3.1 provides high-quality AI video generation capabilities
  2. **Multiple Aspect Ratio Support**: Supports various aspect ratios, provides original video when not 16:9
  3. **English Prompts**: Only supports English prompts, please ensure input is in English
  4. **Content Safety**: Strict content review mechanism to ensure generated content is safe and compliant
  5. **Flexible Output**: resultUrls may contain multiple video files
  6. **Original Preservation**: When aspect ratio is not 16:9, original size video will be preserved
</Note>

## Alternative Solutions

If you cannot use the callback mechanism, you can also use polling:

<Card title="Poll Query Results" icon="radar" href="/veo3-api/get-veo-3-video-details">
  Use the Get Veo3.1 Video Details interface to periodically query task status, recommend querying every 30 seconds.
</Card>


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.kie.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Extend Veo 3.1 AI Video

> Extend an existing Veo3.1 video by generating new content based on the original video and a text prompt.

<Info>
  Extend an existing Veo 3.1 video by generating new content based on the original video and a text prompt. This feature allows you to extend video duration or add new content based on your existing video clips.
</Info>

Our **Veo 3.1 Video Extension API** is more than simple video splicing. It layers intelligent extension algorithms on top of the official models, giving you greater flexibility and markedly higher success rates — **25% of the official Google pricing** (see [pricing details](https://kie.ai/pricing) for full details).

| Capability              | Details                                                                         |
| :---------------------- | :------------------------------------------------------------------------------ |
| **Smart Extension**     | Generate new video segments based on existing videos and text prompts           |
| **Seamless Connection** | Extended videos naturally connect with the original video                       |
| **Flexible Control**    | Precisely control the style and actions of extended content through prompts     |
| **High-Quality Output** | Maintain the same quality and style as the original video                       |
| **Audio Track**         | Extended videos default to background audio, consistent with the original video |

### Why our Veo 3.1 Video Extension is different

1. **Smart Content Understanding** – Deeply understands the content and style of the original video to ensure coherence of extended content.
2. **Natural Transition** – Extended video segments seamlessly connect with the original video without visible splicing marks.
3. **Flexible Control** – Precisely control the actions, scenes, and styles of extended content through detailed prompts.
4. **Significant Cost Savings** – Our rates are 25% of Google's direct API pricing.

***

### Video Extension Workflow

The video extension feature is based on your existing Veo3.1 generated videos and works through the following steps:

1. **Provide Original Video**: Use the `taskId` from the original video generation task
2. **Describe Extension Content**: Use `prompt` to detail how you want the video to be extended
3. **Smart Analysis**: The system analyzes the content, style, and actions of the original video
4. **Generate Extension**: Generate new video segments based on analysis results and your prompts
5. **Seamless Connection**: Naturally connect the extended video with the original video

## Request Parameters

<ParamField body="taskId" type="string" required>
  Task ID of the original video generation. Must be a valid taskId returned from the video generation interface. Note: Videos generated after 1080P generation cannot be extended.
</ParamField>

<ParamField body="prompt" type="string" required>
  Text prompt describing the extended video content. Should detail how you want the video to be extended, including actions, scene changes, style, etc.
</ParamField>

<ParamField body="seeds" type="integer">
  Random seed parameter for controlling the randomness of generated content. Range: 10000-99999. Same seeds will generate similar video content, different seeds will generate different video content. If not specified, the system will automatically assign random seeds.
</ParamField>

<ParamField body="watermark" type="string">
  Watermark text (optional). If provided, a watermark will be added to the generated video.
</ParamField>

<ParamField body="callBackUrl" type="string">
  Callback URL when the task is completed (optional). Strongly recommended for production environments.
</ParamField>

### Extension Features

<Info>
  Through the video extension feature, you can:

  * Extend video duration and add more content
  * Change video direction and add new actions or scenes
  * Add new elements while maintaining the original style
  * Create richer video stories
</Info>

**Extension Features:**

* **Smart Analysis**: Deeply understand the content and style of the original video
* **Natural Connection**: Extended content seamlessly connects with the original video
* **Flexible Control**: Precisely control extended content through prompts
* **Quality Assurance**: Maintain the same quality and style as the original video

<Warning>
  **Important Notes**

  * Can only extend videos generated through the Veo3.1 API
  * Extended content must also comply with platform content policies
  * Recommend using English prompts for best results
  * Video extension consumes credits, see [pricing Details](https://kie.ai/pricing) for specific pricing
</Warning>

### Best Practices

<Tip>
  ### Prompt Writing Suggestions

  1. **Detailed Action Description**: Clearly describe how you want the video to be extended, e.g., "the dog continues running through the park, jumping over obstacles"
  2. **Maintain Style Consistency**: Ensure the style of extended content matches the original video
  3. **Natural Transition**: Described actions should naturally connect with the end of the original video
  4. **Use English**: Recommend using English prompts for best results
  5. **Avoid Conflicts**: Ensure extended content doesn't create logical conflicts with the original video

  ### Technical Recommendations

  1. **Use Callbacks**: Strongly recommend using callback mechanisms to get results in production environments
  2. **Download Promptly**: Download video files promptly after generation, URLs have time limits
  3. **Error Handling**: Implement appropriate error handling and retry mechanisms
  4. **Credit Management**: Monitor credit usage to ensure sufficient balance
  5. **Seed Control**: Use the seeds parameter to control the randomness of generated content
</Tip>

## Important Notes

<Warning>
  ### Important Limitations

  * **Original Video Requirements**: Can only extend videos generated through the Veo3.1 API
  * **Content Policy**: Extended content must also comply with platform content policies
  * **Credit Consumption**: Video extension consumes credits, see [pricing Details](https://kie.ai/pricing) for specific pricing
  * **Processing Time**: Video extension may take several minutes to over ten minutes to process
  * **URL Validity**: Generated video URLs have time limits, please download and save promptly
</Warning>

<Note>
  ### Extended Video Features

  * **Seamless Connection**: Extended videos will naturally connect with the original video
  * **Quality Maintenance**: Extended videos maintain the same quality as the original video
  * **Style Consistency**: Extended content will maintain the visual style of the original video
  * **Flexible Control**: Prompts can precisely control the content and direction of extension
</Note>

## Troubleshooting

<AccordionGroup>
  <Accordion title="Common Error Handling">
    * **404 Error**: Check if task\_id and media\_id are correct
    * **400 Error**: Check if the prompt complies with content policies
    * **402 Error**: Confirm the account has sufficient credits
    * **500 Error**: Temporary server issue, please try again later
  </Accordion>

  <Accordion title="Extension Quality Issues">
    * **Unnatural Connection**: Try more detailed prompt descriptions
    * **Style Inconsistency**: Ensure the prompt includes style descriptions
    * **Disconnected Actions**: Check if action descriptions in the prompt are reasonable
    * **Content Deviation**: Adjust prompts to more accurately describe desired extension content
  </Accordion>

  <Accordion title="Technical Issues">
    * **Callback Receipt Failure**: Check if the callback URL is accessible
    * **Video Download Failure**: Confirm URL validity and network connection
    * **Abnormal Task Status**: Use the details query interface to check task status
    * **Insufficient Credits**: Recharge credits promptly to continue using the service
  </Accordion>
</AccordionGroup>


## OpenAPI

````yaml veo3-api/veo3-api.json post /api/v1/veo/extend
openapi: 3.0.0
info:
  title: Veo3.1 API
  description: kie.ai Veo3.1 API Documentation - Text-to-Video and Image-to-Video API
  version: 1.0.0
  contact:
    name: Technical Support
    email: support@kie.ai
servers:
  - url: https://api.kie.ai
    description: API Server
security:
  - BearerAuth: []
paths:
  /api/v1/veo/extend:
    post:
      summary: Extend Veo3.1 Video
      description: >-
        Extend an existing Veo3.1 video by generating new content based on the
        original video and a text prompt.
      operationId: extend-veo3-1-video
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                taskId:
                  type: string
                  description: >-
                    Task ID of the original video generation. Must be a valid
                    taskId returned from the video generation interface. Note:
                    Videos generated after 1080P generation cannot be extended.
                  example: veo_task_abcdef123456
                prompt:
                  type: string
                  description: >-
                    Text prompt describing the extended video content. Should
                    detail how you want the video to be extended, including
                    actions, scene changes, style, etc.
                  example: >-
                    The dog continues running through the park, jumping over
                    obstacles and playing with other dogs
                seeds:
                  type: integer
                  description: >-
                    Random seed parameter for controlling the randomness of
                    generated content. Range: 10000-99999. Same seeds will
                    generate similar video content, different seeds will
                    generate different video content. If not specified, the
                    system will automatically assign random seeds.
                  minimum: 10000
                  maximum: 99999
                  example: 12345
                watermark:
                  type: string
                  description: >-
                    Watermark text (optional). If provided, a watermark will be
                    added to the generated video.
                  example: MyBrand
                callBackUrl:
                  type: string
                  description: >-
                    Callback URL when the task is completed (optional). Strongly
                    recommended for production environments.


                    - The system will send a POST request to this URL when video
                    extension is completed, containing task status and results

                    - The callback contains generated video URLs, task
                    information, etc.

                    - Your callback endpoint should accept POST requests with
                    JSON payloads containing video results

                    - For detailed callback format and implementation guide, see
                    [Video Generation
                    Callbacks](https://docs.kie.ai/veo3-api/generate-veo-3-video-callbacks)

                    - To ensure callback security, see [Webhook Verification
                    Guide](/common-api/webhook-verification) for signature
                    verification implementation

                    - Alternatively, you can use [the get video details
                    interface](https://docs.kie.ai/veo3-api/get-veo-3-video-details)
                    to poll task status
                  example: https://your-callback-url.com/veo-extend-callback
                model:
                  type: string
                  description: >-
                    Model type for video extension (optional). Defaults to
                    `fast` if not specified.


                    - **fast**: Fast generation mode

                    - **quality**: High quality generation mode
                  enum:
                    - fast
                    - quality
                  default: fast
                  example: fast
              required:
                - taskId
                - prompt
              example:
                taskId: veo_task_abcdef123456
                prompt: >-
                  The dog continues running through the park, jumping over
                  obstacles and playing with other dogs
                seeds: 12345
                watermark: MyBrand
                callBackUrl: https://your-callback-url.com/veo-extend-callback
                model: fast
      responses:
        '200':
          description: Request successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    enum:
                      - 200
                      - 400
                      - 401
                      - 402
                      - 404
                      - 422
                      - 429
                      - 455
                      - 500
                      - 501
                      - 505
                    description: >-
                      Response status code


                      - **200**: Success - Extension task created

                      - **400**: Client error - Prompt violates content policy
                      or other input errors

                      - **401**: Unauthorized - Authentication credentials
                      missing or invalid

                      - **402**: Insufficient credits - Account does not have
                      enough credits to perform the operation

                      - **404**: Not found - Original video or task does not
                      exist

                      - **422**: Validation error - Request parameter validation
                      failed

                      - **429**: Rate limit - Exceeded the request limit for
                      this resource

                      - **455**: Service unavailable - System is under
                      maintenance

                      - **500**: Server error - Unexpected error occurred while
                      processing the request

                      - **501**: Extension failed - Video extension task failed

                      - **505**: Feature disabled - The requested feature is
                      currently disabled
                  msg:
                    type: string
                    description: Response message
                    example: success
                  data:
                    type: object
                    properties:
                      taskId:
                        type: string
                        description: >-
                          Task ID that can be used to query task status via the
                          get video details interface
                        example: veo_extend_task_xyz789
                example:
                  code: 200
                  msg: success
                  data:
                    taskId: veo_extend_task_xyz789
        '500':
          $ref: '#/components/responses/Error'
      callbacks:
        onVideoExtended:
          '{$request.body#/callBackUrl}':
            post:
              summary: Video Extension Callback
              description: >-
                When the video extension task is completed, the system will send
                the result to your provided callback URL via POST request
              requestBody:
                required: true
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        code:
                          type: integer
                          description: >-
                            Status code


                            - **200**: Success - Video extension task successful

                            - **400**: Your prompt was flagged by the website as
                            violating content policies.

                            English prompts only.

                            Unable to retrieve image. Please verify any access
                            restrictions set by you or your service provider.

                            Public error: Unsafe image upload.

                            - **500**: Internal error, please try again later.

                            Internal error - Timeout

                            - **501**: Failed - Video extension task failed
                          enum:
                            - 200
                            - 400
                            - 500
                            - 501
                        msg:
                          type: string
                          description: Status message
                          example: Veo3.1 video extension successful.
                        data:
                          type: object
                          properties:
                            taskId:
                              type: string
                              description: Task ID
                              example: veo_extend_task_xyz789
                            info:
                              type: object
                              properties:
                                resultUrls:
                                  type: string
                                  description: Extended video URLs
                                  example: '[http://example.com/extended_video1.mp4]'
                                originUrls:
                                  type: string
                                  description: >-
                                    Original video URLs. Only available when
                                    aspect_ratio is not 16:9
                                  example: '[http://example.com/original_video1.mp4]'
                                resolution:
                                  type: string
                                  description: Video resolution information
                                  example: 1080p
                            fallbackFlag:
                              type: boolean
                              description: >-
                                Whether generated through fallback model. true
                                means using backup model generation, false means
                                using main model generation
                              example: false
                              deprecated: true
              responses:
                '200':
                  description: Callback received successfully
components:
  responses:
    Error:
      description: Server Error
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: API Key
      description: >-
        All APIs require authentication via Bearer Token.


        Get API Key: 

        1. Visit [API Key Management Page](https://kie.ai/api-key) to get your
        API Key


        Usage:

        Add to request header:

        Authorization: Bearer YOUR_API_KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.kie.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Get 1080P Video

> Get the high-definition 1080P version of a Veo3.1 video generation task.

<Info>
  Get the high-definition 1080P version of a Veo 3.1 video generation task.
</Info>

<Note>
  Legacy note: If your task was generated via a deprecated fallback path, 1080P may already be the default output and this endpoint may not apply.
</Note>

### Usage Instructions

* 1080P generation requires extra processing time — typically **\~1–3 minutes** depending on load.
* If the 1080P video is not ready yet, the endpoint may return a non-200 code. In this case, wait a bit and retry (recommended interval: **20–30s**) until the result is available.
* Make sure the **original generation task is successful** before requesting 1080P.


## OpenAPI

````yaml veo3-api/veo3-api.json get /api/v1/veo/get-1080p-video
openapi: 3.0.0
info:
  title: Veo3.1 API
  description: kie.ai Veo3.1 API Documentation - Text-to-Video and Image-to-Video API
  version: 1.0.0
  contact:
    name: Technical Support
    email: support@kie.ai
servers:
  - url: https://api.kie.ai
    description: API Server
security:
  - BearerAuth: []
paths:
  /api/v1/veo/get-1080p-video:
    get:
      summary: Get 1080P Video
      description: Get the high-definition 1080P version of a Veo3.1 video generation task.
      operationId: get-veo3-1-1080p-video
      parameters:
        - in: query
          name: taskId
          description: Task ID
          required: true
          schema:
            type: string
          example: veo_task_abcdef123456
        - in: query
          name: index
          description: video index
          required: false
          schema:
            type: integer
          example: '0'
      responses:
        '200':
          description: Request successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    enum:
                      - 200
                      - 401
                      - 404
                      - 422
                      - 429
                      - 451
                      - 455
                      - 500
                    description: >-
                      Response status code


                      - **200**: Success - Request has been processed
                      successfully

                      - **401**: Unauthorized - Authentication credentials are
                      missing or invalid

                      - **404**: Not Found - The requested resource or endpoint
                      does not exist

                      - **422**: Validation Error - The request parameters
                      failed validation checks.

                      record is null.

                      Temporarily supports records within 14 days.

                      record result data is blank.

                      record status is not success.

                      record result data not exist.

                      record result data is empty.

                      - **429**: Rate Limited - Request limit has been exceeded
                      for this resource

                      - **451**: Failed to fetch the image. Kindly verify any
                      access limits set by you or your service provider.

                      - **455**: Service Unavailable - System is currently
                      undergoing maintenance

                      - **500**: Server Error - An unexpected error occurred
                      while processing the request
                  msg:
                    type: string
                    description: Error message when code != 200
                    example: success
                  data:
                    type: object
                    properties:
                      resultUrl:
                        type: string
                        description: 1080P high-definition video download URL
                        example: >-
                          https://tempfile.aiquickdraw.com/p/42f4f8facbb040c0ade87c27cb2d5e58_1749711595.mp4
              example:
                code: 200
                msg: success
                data:
                  resultUrl: >-
                    https://tempfile.aiquickdraw.com/p/42f4f8facbb040c0ade87c27cb2d5e58_1749711595.mp4
        '500':
          $ref: '#/components/responses/Error'
components:
  responses:
    Error:
      description: Server Error
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: API Key
      description: >-
        All APIs require authentication via Bearer Token.


        Get API Key: 

        1. Visit [API Key Management Page](https://kie.ai/api-key) to get your
        API Key


        Usage:

        Add to request header:

        Authorization: Bearer YOUR_API_KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.kie.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Get 4K Video

> Get the ultra-high-definition 4K version of a Veo3.1 video generation task.

<Info>
  Get the ultra-high-definition 4K version of a Veo 3.1 video generation task.
</Info>

<Note>
  Legacy note: If a task was generated via a deprecated fallback path, this endpoint may not apply.
</Note>

### Usage Instructions

* **API method difference**
  * **1080P** uses **GET**: `/api/v1/veo/get-1080p-video`
  * **4K** uses **POST**: `/api/v1/veo/get-4k-video`
* **Credit consumption**
  * 4K requires **additional credits**.
  * The extra cost is approximately **equivalent to 2× “Fast mode” video generations** (see [pricing details](https://kie.ai/pricing) for the latest).
* **Supported aspect ratios**
  * Both **16:9** and **9:16** tasks support upgrading to **1080P** and **4K**.
* **Processing time**
  * 4K generation requires significant extra processing time — typically **\~5–10 minutes** depending on load.
* If the 4K video is not ready yet, the endpoint may return a non-200 code. Wait and retry (recommended interval: **30s+**) until the result is available.

<Tip>
  For production use, we recommend using `callBackUrl` to receive automatic notifications when 4K generation completes, rather than polling frequently.
</Tip>

## Callbacks

After submitting a 4K video generation task, use the unified callback mechanism to receive generation completion notifications:

<Card title="4K Video Generation Callbacks" icon="bell" href="/veo3-api/get-veo-3-4k-video-callbacks">
  Learn how to configure and handle 4K video generation callback notifications
</Card>

## Error Responses

When submitting repeated requests for the same task ID, the system returns a `422` status code with specific error details:

<CodeGroup>
  ```json 4K Video Processing theme={null}
  {
    "code": 422,
    "msg": "4k is processing. It should be ready in 5-10 minutes. Please check back shortly.",
    "data": {
      "taskId": "veo_task_example123",
      "resultUrls": null,
      "imageUrls": null
    }
  }
  ```

  ```json 4K Video Already Generated theme={null}
  {
    "code": 422,
    "msg": "The video has been generated successfully",
    "data": {
      "taskId": "veo_task_example123",
      "resultUrls": [
        "https://tempfile.aiquickdraw.com/v/example_task_1234567890.mp4"
      ],
      "imageUrls": [
        "https://tempfile.aiquickdraw.com/v/example_task_1234567890.jpg"
      ]
    }
  }
  ```
</CodeGroup>


## OpenAPI

````yaml veo3-api/veo3-api.json post /api/v1/veo/get-4k-video
openapi: 3.0.0
info:
  title: Veo3.1 API
  description: kie.ai Veo3.1 API Documentation - Text-to-Video and Image-to-Video API
  version: 1.0.0
  contact:
    name: Technical Support
    email: support@kie.ai
servers:
  - url: https://api.kie.ai
    description: API Server
security:
  - BearerAuth: []
paths:
  /api/v1/veo/get-4k-video:
    post:
      summary: Get 4K Video
      description: >-
        Get the ultra-high-definition 4K version of a Veo3.1 video generation
        task.
      operationId: get-veo3-1-4k-video
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - taskId
              properties:
                taskId:
                  type: string
                  description: Task ID
                  example: veo_task_abcdef123456
                index:
                  type: integer
                  description: video index
                  default: 0
                  example: 0
                callBackUrl:
                  type: string
                  format: uri
                  description: >-
                    The URL to receive 4K video generation task completion
                    updates. Optional but recommended for production use.


                    - System will POST task status and results to this URL when
                    4K video generation completes

                    - Callback includes generated video URLs, media IDs, and
                    related information

                    - Your callback endpoint should accept POST requests with
                    JSON payload containing results

                    - To ensure callback security, see [Webhook Verification
                    Guide](/common-api/webhook-verification) for signature
                    verification implementation

                    - Alternatively, use the Get Video Details endpoint to poll
                    task status
                  example: http://your-callback-url.com/4k-callback
            example:
              taskId: veo_task_abcdef123456
              index: 0
              callBackUrl: http://your-callback-url.com/4k-callback
      responses:
        '200':
          description: Request successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    enum:
                      - 200
                      - 401
                      - 404
                      - 422
                      - 429
                      - 451
                      - 455
                      - 500
                    description: >-
                      Response status code


                      - **200**: Success - Request has been processed
                      successfully

                      - **401**: Unauthorized - Authentication credentials are
                      missing or invalid

                      - **404**: Not Found - The requested resource or endpoint
                      does not exist

                      - **422**: Validation Error - The request parameters
                      failed validation checks.

                      record is null.

                      Temporarily supports records within 14 days.

                      record result data is blank.

                      record status is not success.

                      record result data not exist.

                      record result data is empty.

                      - **429**: Rate Limited - Request limit has been exceeded
                      for this resource

                      - **451**: Failed to fetch the image. Kindly verify any
                      access limits set by you or your service provider.

                      - **455**: Service Unavailable - System is currently
                      undergoing maintenance

                      - **500**: Server Error - An unexpected error occurred
                      while processing the request
                  msg:
                    type: string
                    description: Error message when code != 200
                    example: success
                  data:
                    type: object
                    properties:
                      taskId:
                        type: string
                        description: >-
                          Task ID, can be used with Get Video Details endpoint
                          to query task status
                        example: veo_task_abcdef123456
                      resultUrls:
                        type: array
                        items:
                          type: string
                        description: Generated 4K video URLs
                        example:
                          - >-
                            https://file.aiquickdraw.com/v/example_task_1234567890.mp4
                      imageUrls:
                        type: array
                        items:
                          type: string
                        description: Related thumbnail or preview image URLs
                        example:
                          - >-
                            https://file.aiquickdraw.com/v/example_task_1234567890.jpg
              example:
                code: 200
                msg: success
                data:
                  taskId: veo_task_abcdef123456
                  resultUrls: null
                  imageUrls: null
        '500':
          $ref: '#/components/responses/Error'
      callbacks:
        on4KVideoGenerated:
          '{$request.body#/callBackUrl}':
            post:
              summary: 4K Video Generation Callback
              description: >-
                When the 4K video generation task completes, the system will
                send a POST request to your configured callback URL
              requestBody:
                required: true
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        code:
                          type: integer
                          description: >-
                            Status code


                            - **200**: Success - 4K video generation task
                            successful
                          enum:
                            - 200
                            - 400
                            - 500
                        msg:
                          type: string
                          description: Status message
                          example: 4K Video generated successfully.
                        data:
                          type: object
                          properties:
                            task_id:
                              type: string
                              description: Task ID
                              example: bf3e7adb-fb6c-4257-bbcd-470787386fb0
                            result_urls:
                              type: array
                              items:
                                type: string
                              description: Generated 4K video URLs
                              example:
                                - >-
                                  https://file.aiquickdraw.com/p/d1301f0aa3f647c1ab7bb1f60ef006c0_1750236843.mp4
                            media_ids:
                              type: array
                              items:
                                type: string
                              description: Media IDs
                              example:
                                - >-
                                  CAUaJDQ5NGYwY2NhLTE1NTUtNDIzNS1iNjJiLWE0OWE4NzMxNjMzOCIDQ0FFKi4xMDJlOTA5MS01NGJlLTQzN2EtODhkMC01NWNkNGUxNTllNTNfdXBzYW1wbGVk
                            image_urls:
                              type: array
                              items:
                                type: string
                              description: Related image URLs
                              example:
                                - >-
                                  https://tempfile.aiquickdraw.com/p/d1301f0aa3f647c1ab7bb1f60ef006c0_1750236843.jpg
              responses:
                '200':
                  description: Callback received successfully
components:
  responses:
    Error:
      description: Server Error
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: API Key
      description: >-
        All APIs require authentication via Bearer Token.


        Get API Key: 

        1. Visit [API Key Management Page](https://kie.ai/api-key) to get your
        API Key


        Usage:

        Add to request header:

        Authorization: Bearer YOUR_API_KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.kie.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Get 4K Video Callbacks

> When video generation completes, the system calls this callback to notify results

<Info>
  When the 4K video generation task completes, the system will notify you of the results through callback mechanism.
</Info>

<Tip>
  **Webhook Security**: To ensure the authenticity and integrity of callback requests, we strongly recommend implementing webhook signature verification. See our [Webhook Verification Guide](/common-api/webhook-verification) for detailed implementation steps.
</Tip>

### Callback Configuration

Configure the callback URL when requesting 4K video generation:

```json  theme={null}
{
  "taskId": "veo_task_abcdef123456",
  "index": 0,
  "callBackUrl": "https://your-domain.com/api/4k-callback"
}
```

### Callback Format

When 4K video generation completes, the system will send a POST request to your configured callback URL with the following format:

<CodeGroup>
  ```json Success Callback Result theme={null}
  {
    "code": 200,
    "msg": "4K Video generated successfully.",
    "data": {
      "taskId": "veo_task_example123",
      "info": {
        "resultUrls": [
          "https://file.aiquickdraw.com/v/example_task_1234567890.mp4"
        ],
        "imageUrls": [
          "https://file.aiquickdraw.com/v/example_task_1234567890.jpg"
        ]
      }
    }
  }
  ```

  ```json Failure Callback Result theme={null}
  {
    "code": 500,
    "msg": "The 4K version of this video is unavailable. Please try a different video.",
    "data": {
      "taskId": "veo_task_abcdef123456",
    }
  }
  ```
</CodeGroup>

### Callback Field Descriptions

| Field                  | Type           | Description                                                                                   |
| ---------------------- | -------------- | --------------------------------------------------------------------------------------------- |
| `code`                 | integer        | Status code, 200 indicates success, 500 indicates failure                                     |
| `msg`                  | string         | Status message, success shows "4K Video generated successfully.", failure shows error message |
| `data`                 | object \| null | Task result data when successful, null when failed                                            |
| `data.taskId`          | string         | Task ID                                                                                       |
| `data.info`            | object         | Object containing detailed result information                                                 |
| `data.info.resultUrls` | array          | Generated 4K video URL array                                                                  |
| `data.info.imageUrls`  | array          | Related thumbnail or preview image URL array                                                  |

### Callback Handling

<Steps>
  <Step title="Verify Callback">
    Check the `code` field to confirm generation success
  </Step>

  <Step title="Extract Results">
    Retrieve the generated 4K video download address from `data.info.resultUrls`
  </Step>

  <Step title="Respond to Callback">
    Your server should return a 200 status code to confirm callback receipt
  </Step>
</Steps>

### Error Handling

If errors occur during 4K video generation, the callback will return an error status code with the corresponding error message. Currently supported error cases include:

* **500**: 4K version unavailable - "The 4K version of this video is unavailable. Please try a different video."

<Warning>
  Ensure your callback endpoint can handle duplicate callbacks to avoid processing the same task multiple times.
</Warning>

## Best Practices

<Tip>
  ### 4K Video Generation Callback Handling Recommendations

  1. **Timely Download**: 4K video files are large and URLs may have validity period limitations, please download and save promptly
  2. **Idempotent Processing**: The same task may receive multiple callbacks, ensure processing logic is idempotent
  3. **Error Retry**: If you receive a 4K unavailable error, you can try using a different video or contact technical support
  4. **Media Management**: Use the returned data for media file management and tracking
  5. **Storage Planning**: 4K video files are typically very large, ensure sufficient storage space
</Tip>

## Alternative Solutions

If you cannot use the callback mechanism, you can also use polling:

<Card title="Poll Query Results" icon="radar" href="/veo3-api/get-veo-3-video-details">
  Use the Get Video Details endpoint to periodically query 4K video generation task status.
</Card>


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.kie.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Veo3.1 Video Details

> Query the execution status and results of Veo3.1 video generation tasks.

<Info>
  This endpoint is the authoritative source of truth for querying the execution status
  and final results of all Veo 3.1 video tasks, including regular generation,
  video extension, 1080P upgrade, and 4K upgrade tasks.
</Info>

## Supported Task Types

This interface supports querying **all Veo 3.1 task types**, including:

* **Regular Video Generation**\
  Text-to-video, image-to-video, reference/material-based generation
* **Video Extension**\
  Tasks created via the Extend Veo 3.1 Video interface
* **1080P Upgrade Tasks**\
  High-definition upgrade tasks created via Get 1080P Video
* **4K Upgrade Tasks**\
  Ultra-high-definition upgrade tasks created via Get 4K Video

## Status Descriptions

| successFlag | Description                                                                  |
| ----------- | ---------------------------------------------------------------------------- |
| `0`         | Generating — task is currently being processed                               |
| `1`         | Success — task completed successfully                                        |
| `2`         | Failed — task failed before completion                                       |
| `3`         | Generation Failed — task created successfully but upstream generation failed |

## Important Notes

* Query task status using `taskId`
* You may poll this endpoint periodically until the task completes
* Callback mechanisms push completion events, but **this endpoint remains the final authority**
* `fallbackFlag` is a **legacy field** and may appear only in older regular generation tasks

### Response Field Descriptions

<ParamField path="fallbackFlag" type="boolean">
  Only exists in regular video generation tasks. Whether generated using fallback model. `true` means backup model was used, `false` means primary model was used. 4K video generation tasks do not include this field.
</ParamField>

<ParamField path="successFlag" type="integer">
  Task success status identifier:

  * `0`: Generating
  * `1`: Success
  * `2`: Failed
  * `3`: Generation Failed
</ParamField>

<ParamField path="response" type="object">
  Detailed result information after task completion. For regular video generation tasks, contains video URLs etc.; for 4K video generation tasks, contains 4K video URLs and related media information.
</ParamField>

### Task Type Identification

#### Regular Video Generation Tasks

The `fallbackFlag` field can identify whether the task used a fallback model:

* `true`: Generated using fallback model, video resolution is 720p
* `false`: Generated using primary model, may support 1080P (16:9 aspect ratio)

<Note>
  Videos generated using the fallback model cannot be upgraded to high-definition versions through the Get 1080P Video interface.
</Note>

#### 4K Video Generation Tasks

* Dedicated tasks for generating 4K ultra-high-definition videos
* Does not include `fallbackFlag` field
* Generated videos are in 4K resolution
* Response includes `mediaIds` and related media information


## OpenAPI

````yaml veo3-api/veo3-api.json get /api/v1/veo/record-info
openapi: 3.0.0
info:
  title: Veo3.1 API
  description: kie.ai Veo3.1 API Documentation - Text-to-Video and Image-to-Video API
  version: 1.0.0
  contact:
    name: Technical Support
    email: support@kie.ai
servers:
  - url: https://api.kie.ai
    description: API Server
security:
  - BearerAuth: []
paths:
  /api/v1/veo/record-info:
    get:
      summary: Get Veo3.1 Video Details
      description: Query the execution status and results of Veo3.1 video generation tasks.
      operationId: get-veo3-1-video-details
      parameters:
        - in: query
          name: taskId
          description: Task ID
          required: true
          schema:
            type: string
          example: veo_task_abcdef123456
      responses:
        '200':
          description: Request successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    enum:
                      - 200
                      - 400
                      - 401
                      - 404
                      - 422
                      - 451
                      - 455
                      - 500
                    description: >-
                      Response status code


                      - **200**: Success - Request has been processed
                      successfully

                      - **400**: Your prompt was flagged by Website as violating
                      content policies.

                      Only English prompts are supported at this time.

                      Failed to fetch the image. Kindly verify any access limits
                      set by you or your service provider.

                      public error unsafe image upload.

                      - **401**: Unauthorized - Authentication credentials are
                      missing or invalid

                      - **404**: Not Found - The requested resource or endpoint
                      does not exist

                      - **422**: Validation Error - The request parameters
                      failed validation checks.

                      record is null.

                      Temporarily supports records within 14 days.

                      record result data is blank.

                      record status is not success.

                      record result data not exist.

                      record result data is empty.

                      - **451**: Failed to fetch the image. Kindly verify any
                      access limits set by you or your service provider.

                      - **455**: Service Unavailable - System is currently
                      undergoing maintenance

                      - **500**: Server Error - An unexpected error occurred
                      while processing the request.

                      Timeout

                      Internal Error, Please try again later.
                  msg:
                    type: string
                    description: Error message when code != 200
                    example: success
                  data:
                    type: object
                    properties:
                      taskId:
                        type: string
                        description: Unique identifier of the video generation task
                        example: veo_task_abcdef123456
                      paramJson:
                        type: string
                        description: Request parameters in JSON format
                        example: >-
                          {"prompt":"A futuristic city with flying cars at
                          sunset.","waterMark":"KieAI"}
                      completeTime:
                        type: string
                        format: date-time
                        description: Task completion time
                        example: '2024-03-20T10:30:00Z'
                      response:
                        type: object
                        description: Final result
                        properties:
                          taskId:
                            type: string
                            description: Task ID
                            example: veo_task_abcdef123456
                          resultUrls:
                            type: array
                            items:
                              type: string
                            description: Generated video URLs
                            example:
                              - http://example.com/video1.mp4
                          originUrls:
                            type: array
                            items:
                              type: string
                            description: >-
                              Original video URLs. Only has value when
                              aspect_ratio is not 16:9
                            example:
                              - http://example.com/original_video1.mp4
                          resolution:
                            type: string
                            description: Video resolution information
                            example: 1080p
                      successFlag:
                        type: integer
                        description: |-
                          Generation status flag

                          - **0**: Generating
                          - **1**: Success
                          - **2**: Failed
                          - **3**: Generation Failed
                        enum:
                          - 0
                          - 1
                          - 2
                        example: 1
                      errorCode:
                        type: integer
                        format: int32
                        description: >-
                          Error code when task fails


                          - **400**: Your prompt was flagged by Website as
                          violating content policies.

                          Only English prompts are supported at this time.

                          Failed to fetch the image. Kindly verify any access
                          limits set by you or your service provider.

                          public error unsafe image upload.

                          - **500**: Internal Error, Please try again later.

                          Internal Error - Timeout

                          - **501**: Failed - Video generation task failed
                        enum:
                          - 400
                          - 500
                          - 501
                      errorMessage:
                        type: string
                        description: Error message when task fails
                        example: null
                      createTime:
                        type: string
                        format: date-time
                        description: Task creation time
                        example: '2024-03-20T10:25:00Z'
                      fallbackFlag:
                        type: boolean
                        description: >-
                          Whether generated using fallback model. True means
                          backup model was used, false means primary model was
                          used
                        example: false
                        deprecated: true
              example:
                code: 200
                msg: success
                data:
                  taskId: veo_task_abcdef123456
                  paramJson: >-
                    {"prompt":"A futuristic city with flying cars at
                    sunset.","waterMark":"KieAI"}
                  completeTime: '2025-06-06 10:30:00'
                  response:
                    taskId: veo_task_abcdef123456
                    resultUrls:
                      - http://example.com/video1.mp4
                    originUrls:
                      - http://example.com/original_video1.mp4
                    resolution: 1080p
                  successFlag: 1
                  errorCode: null
                  errorMessage: ''
                  createTime: '2025-06-06 10:25:00'
                  fallbackFlag: false
        '500':
          $ref: '#/components/responses/Error'
components:
  responses:
    Error:
      description: Server Error
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: API Key
      description: >-
        All APIs require authentication via Bearer Token.


        Get API Key: 

        1. Visit [API Key Management Page](https://kie.ai/api-key) to get your
        API Key


        Usage:

        Add to request header:

        Authorization: Bearer YOUR_API_KEY

````