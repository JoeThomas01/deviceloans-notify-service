import { app, EventGridEvent, InvocationContext } from '@azure/functions';

type ProductData = {
  id: string;
  name: string;
  pricePence: number;
  description: string;
  updatedAt: Date;
};

type ProductUpdatedCloudEvent = {
  specversion: string;
  type: string;
  source: string;
  subject: string;
  id: string;
  time: string;
  datacontenttype: string;
  data: ProductData;
};

export async function productUpdatedEventGrid(
  event: EventGridEvent,
  context: InvocationContext
): Promise<void> {
  // Log the event for demonstration purposes
  context.log(
    'Event Grid function processed event:',
    JSON.stringify(event, null, 2)
  );

  // The event body contains the CloudEvent
  const cloudEvent = event as unknown as ProductUpdatedCloudEvent;

  // TODO: should pass event to an application layer use case to handle
}

app.eventGrid('productUpdatedEventGrid', {
  handler: productUpdatedEventGrid,
});
