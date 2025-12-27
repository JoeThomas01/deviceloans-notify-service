# Event Subscription Example

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local settings file:

Copy the template to create your local development settings:

```bash
cp local.settings.template.json local.settings.json
```

> **Note:** Never commit your `local.settings.json` to source control. The template is safe to share.

3. Build the project:

```bash
npm run build
```

## Locally testing the Event Grid Function

Start the Azure Functions runtime:

```bash
npm start
```

### Using curl with sample data

Once the function is running locally, you can test the `productUpdatedEventGrid` function using curl with the sample event data. The function requires a HTTP POST, so cannot be done from a web browser. Split the VS Code terminal so you can see the output from the localling running app whilst having a new shell prompt to send the sample event data:

```bash
curl -i -X POST "http://localhost:7071/runtime/webhooks/eventgrid?functionName=productUpdatedEventGrid" \
  -H "Content-Type: application/json" \
  -H "aeg-event-type: Notification" \
  -d @samples/product-updated-event.json
```

**Note:** The Event Grid trigger requires the `aeg-event-type: Notification` header when testing locally.

### Expected Response

You should receive a `202 Accepted` response, and the function console will display the event details including:

- CloudEvent metadata (id, type, source, subject, time)
- Product information (id, name, price, description, updatedAt)

Check the terminal where the Azure Functions runtime is running to see the logged output.

## Azure Setup

To recieve actual events published via Event Grid, the Functions app must be deployed to Azure with a subscription to the Event Grid Topic.

### Prerequisites

- Azure CLI installed and logged in (`az login`)
- An existing Azure Event Grid Topic (see publishing example repo)

### Deploy Function App

1. Create a resource group (if you don't have one):

```bash
az group create --name <resource-group-name> --location <location>
```

Remember to follow our naming convention, e.g. `shopping-lab-ab47-rg`

2. Create a storage account (required for Azure Functions):

```bash
az storage account create \
  --name <storage-account-name> \
  --resource-group <resource-group-name> \
  --location <location> \
  --sku Standard_LRS
```

Remember storage accounts must just be letters and numbers, e.g. `shoppinglabab47funcstore`

3. Create a Function App:

```bash
az functionapp create \
  --name <function-app-name> \
  --resource-group <resource-group-name> \
  --storage-account <storage-account-name> \
  --consumption-plan-location <location> \
  --runtime node \
  --functions-version 4
```

4. Deploy the function code:

```bash
npm run build
func azure functionapp publish <function-app-name>
```

### Create Event Grid Subscription

> You must have an existing Event Grid Topic to subscribe to. Follow the instructions in the publishing example code repo to create one.

1. Get the source topic resource id:

```bash
az eventgrid topic show \
  --name <your-topic-name> \
  --resource-group <resource-group-name> \
  --query "id" \
  -o tsv
```

2. Get the target function resource id:

```bash
az functionapp function show \
  --name <function-app-name> \
  --resource-group <resource-group-name> \
  --function-name "productUpdatedEventGrid" \
  --query "id" \
  -o tsv
```

Function name is the name of the Event Grid Triggered function within your Azure Function App. It would need updating in the above if following these instructions for other projects.

3. Create the Event Grid subscription:

```bash
az eventgrid event-subscription create \
  --name <subscription-name> \
  --source-resource-id "<topic-resource-id>" \
  --endpoint-type azurefunction \
  --endpoint "<function-resource-id>"
```

The resource ids come from steps 1 and 2. Follow our naming convention for the subscription name, e.g. `shopping-lab-ab47-products-sub`

## Testing the deployed Event Grid Function

The Function app is running in the cloud. It will recieve event notifications via the `productUpdatedEventGrid` function. The function code currently does nothing other than log the event to the output console. To test the event subscription is working, you must monitor the output logs for the deployed function and then send an event via Event Grid for it to receive.

### Monitor Function Logs

View live logs from your deployed function:

```bash
func azure functionapp logstream <function-app-name>
```

Or use Azure CLI:

```bash
az webapp log tail --name <function-app-name> --resource-group <resource-group-name>
```

Or use the web-based Azure Portal: within the Function App resource, open Monitoring > Log Stream.

### Send a test event

Launch the example publishing project and run it locally to trigger an event.
