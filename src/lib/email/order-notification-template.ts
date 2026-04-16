export interface OrderNotificationData {
  confirmationNumber: string
  // Customer
  customerName: string
  customerEmail: string
  customerPhone?: string
  customerType: string
  companyName?: string
  // Property
  streetAddress: string
  unit?: string
  city: string
  zipCode: string
  propertyType: string
  // Scheduling
  requestedDate: string
  timePreference: string
  // Service
  serviceType: string
  includesInstallation: boolean
  // Details
  accessInstructions?: string
  lockboxCode?: string
  contactOnSite?: string
  listingAgentName?: string
  publicNotes?: string
  escrowNumber?: string
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function field(label: string, value: string | undefined | null): string {
  if (!value) return ''
  return `
    <tr>
      <td style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #A1A1AA; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: top; width: 160px;">${label}</td>
      <td style="padding: 6px 0; font-size: 15px; color: #2B2B2B;">${value}</td>
    </tr>`
}

export function buildOrderNotificationHtml(data: OrderNotificationData): string {
  const fullAddress = `${data.streetAddress}${data.unit ? ` #${data.unit}` : ''}, ${data.city}, CA ${data.zipCode}`
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Inspection Request - ${fullAddress}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F5F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background-color: #C8102E; padding: 28px 32px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">New Inspection Request</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #FFD4DB;">Submitted via online order form</p>
            </td>
          </tr>

          <!-- Confirmation & Quick Link -->
          <tr>
            <td style="padding: 28px 32px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAFA; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 2px; font-size: 11px; color: #A1A1AA; text-transform: uppercase; letter-spacing: 0.5px;">Confirmation Number</p>
                    <p style="margin: 0; font-size: 22px; font-weight: 700; color: #2B2B2B; letter-spacing: 1px;">${data.confirmationNumber}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 8px 32px;">
              <hr style="border: none; border-top: 2px solid #D4AF37; margin: 0;" />
            </td>
          </tr>

          <!-- Property Information -->
          <tr>
            <td style="padding: 20px 32px 8px;">
              <h3 style="margin: 0 0 12px; font-size: 12px; font-weight: 700; color: #A1A1AA; text-transform: uppercase; letter-spacing: 1px;">Property Information</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${field('Address', fullAddress)}
                ${field('Property Type', formatLabel(data.propertyType))}
              </table>
            </td>
          </tr>

          <!-- Customer Information -->
          <tr>
            <td style="padding: 20px 32px 8px;">
              <h3 style="margin: 0 0 12px; font-size: 12px; font-weight: 700; color: #A1A1AA; text-transform: uppercase; letter-spacing: 1px;">Customer Information</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${field('Name', data.customerName)}
                ${field('Email', data.customerEmail)}
                ${field('Phone', data.customerPhone)}
                ${field('Type', formatLabel(data.customerType))}
                ${field('Company', data.companyName)}
              </table>
            </td>
          </tr>

          <!-- Scheduling -->
          <tr>
            <td style="padding: 20px 32px 8px;">
              <h3 style="margin: 0 0 12px; font-size: 12px; font-weight: 700; color: #A1A1AA; text-transform: uppercase; letter-spacing: 1px;">Scheduling</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${field('Requested Date', data.requestedDate)}
                ${field('Time Preference', formatLabel(data.timePreference))}
              </table>
            </td>
          </tr>

          <!-- Service Details -->
          <tr>
            <td style="padding: 20px 32px 8px;">
              <h3 style="margin: 0 0 12px; font-size: 12px; font-weight: 700; color: #A1A1AA; text-transform: uppercase; letter-spacing: 1px;">Service Details</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${field('Service Type', formatLabel(data.serviceType))}
                ${field('Includes Installation', data.includesInstallation ? 'Yes' : 'No')}
              </table>
            </td>
          </tr>

          <!-- Access & Notes -->
          ${data.accessInstructions || data.lockboxCode || data.contactOnSite || data.listingAgentName || data.publicNotes || data.escrowNumber ? `
          <tr>
            <td style="padding: 20px 32px 8px;">
              <h3 style="margin: 0 0 12px; font-size: 12px; font-weight: 700; color: #A1A1AA; text-transform: uppercase; letter-spacing: 1px;">Access &amp; Notes</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${field('Access Instructions', data.accessInstructions)}
                ${field('Lockbox Code', data.lockboxCode)}
                ${field('Contact On Site', data.contactOnSite)}
                ${field('Listing Agent', data.listingAgentName)}
                ${field('Escrow Number', data.escrowNumber)}
                ${field('Notes', data.publicNotes)}
              </table>
            </td>
          </tr>` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAFAFA; padding: 24px 32px; text-align: center; border-top: 1px solid #E5E7EB; margin-top: 16px;">
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #2B2B2B;">Seller's Compliance</p>
              <p style="margin: 0 0 4px; font-size: 12px; color: #71717A;">Fast. Simple. Frictionless.</p>
              <p style="margin: 0; font-size: 11px; color: #A1A1AA;">Received ${timestamp}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
