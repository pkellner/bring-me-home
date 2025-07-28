export function addTrackingPixel(htmlContent: string, emailId: string, baseUrl: string): string {
  // Create the tracking pixel URL
  const trackingUrl = `${baseUrl}/api/email/track/${emailId}`;

  // Create the tracking pixel HTML with minimal styling to ensure it loads
  const trackingPixel = `<img src="${trackingUrl}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;border:0;margin:0;padding:0;" />`;

  // Try multiple insertion points in order of preference
  
  // 1. Try to insert before closing </body> tag
  const bodyCloseIndex = htmlContent.lastIndexOf('</body>');
  if (bodyCloseIndex !== -1) {
    console.log("/src/lib/email-tracking.ts: Found closing </body> tag at index", bodyCloseIndex, trackingUrl);
    return htmlContent.slice(0, bodyCloseIndex) + trackingPixel + htmlContent.slice(bodyCloseIndex);
  }
  
  // 2. Try to insert before closing </html> tag
  const htmlCloseIndex = htmlContent.lastIndexOf('</html>');
  if (htmlCloseIndex !== -1) {
    console.log("/src/lib/email-tracking.ts: Found closing </html> tag at index", htmlCloseIndex, trackingUrl);
    return htmlContent.slice(0, htmlCloseIndex) + trackingPixel + htmlContent.slice(htmlCloseIndex);
  }
  
  // 3. Try to insert before closing </div> tag (last one, which is often the wrapper)
  const divCloseIndex = htmlContent.lastIndexOf('</div>');
  if (divCloseIndex !== -1) {
    console.log("/src/lib/email-tracking.ts: Found closing </div> tag at index", divCloseIndex, trackingUrl);
    return htmlContent.slice(0, divCloseIndex) + trackingPixel + htmlContent.slice(divCloseIndex);
  }
  
  // 4. As a last resort, append to the end
  console.log("/src/lib/email-tracking.ts: No suitable closing tag found, appending to end of HTML");
  return htmlContent + trackingPixel;
}