# CloudFront 502 Bad Gateway Error Fix

## Error Details
- **Status**: 502 Bad Gateway
- **Message**: "Error from cloudfront"
- **Meaning**: CloudFront cannot connect to your origin server

## Common Causes & Solutions

### 1. Incorrect Origin Domain Name

**Check in CloudFront Console:**
- Go to your distribution `d1c7tg6cmx1vrl.cloudfront.net`
- Click "Origins" tab
- Verify the "Origin Domain Name"

**Common mistakes:**
- ❌ `http://localhost:3000` - CloudFront cannot reach localhost
- ❌ `your-app.com:3000` - Wrong port
- ❌ `http://your-app.com` - Include protocol in origin settings
- ✅ `your-app.vercel.app` - Correct format (no http://)
- ✅ `your-app.herokuapp.com` - Correct format
- ✅ `your-elb.us-east-1.elb.amazonaws.com` - Correct format

### 2. Origin Protocol Settings

**In Origin Settings, verify:**
- **Origin Protocol Policy**: 
  - If your app uses HTTPS: Select "HTTPS Only"
  - If your app only supports HTTP: Select "HTTP Only"
  - Default: "HTTPS Only" is recommended

- **HTTP Port**: 80 (default)
- **HTTPS Port**: 443 (default)

### 3. Origin Not Publicly Accessible

**Test your origin directly:**
```bash
# Replace with your actual origin domain
curl -I https://your-origin-domain.com/_next/static/media/93f479601ee12b01-s.p.woff2
```

If this fails, your origin might be:
- Behind a firewall
- Requires authentication
- Not deployed
- Using IP restrictions

### 4. Security Group / Firewall Issues (AWS)

If your origin is on AWS:
- Check Security Groups allow inbound HTTPS (443) from anywhere (0.0.0.0/0)
- Check Network ACLs
- Ensure the Load Balancer (if used) is internet-facing

### 5. Custom Headers Required

Some origins require specific headers. In CloudFront:
1. Go to your origin settings
2. Add custom headers if needed:
   - `Host`: your-domain.com (if required)
   - `X-Forwarded-Proto`: https

## Quick Diagnostic Steps

### Step 1: Verify Origin is Accessible
```bash
# Test if your origin responds
curl -I https://your-origin-domain.com/

# Should return 200 OK or 301/302 redirect
```

### Step 2: Check CloudFront Origin Settings
1. Origins → Your Origin → Edit
2. Screenshot or note:
   - Origin Domain Name
   - Origin Protocol Policy
   - Origin Path (should usually be empty)

### Step 3: Test Origin with CloudFront Headers
```bash
# Simulate CloudFront request
curl -I https://your-origin-domain.com/_next/static/chunks/main.js \
  -H "User-Agent: Amazon CloudFront" \
  -H "X-Amz-Cf-Id: test"
```

## Common Origin Configurations

### Vercel
- **Origin Domain**: `your-app.vercel.app`
- **Protocol**: HTTPS Only
- **Port**: 443

### Heroku
- **Origin Domain**: `your-app.herokuapp.com`
- **Protocol**: HTTPS Only
- **Port**: 443

### AWS Application Load Balancer
- **Origin Domain**: `your-alb-name.region.elb.amazonaws.com`
- **Protocol**: HTTPS Only
- **Port**: 443

### Custom Domain
- **Origin Domain**: `app.yourdomain.com`
- **Protocol**: HTTPS Only (if SSL configured)
- **Port**: 443

## Fix Checklist

1. ✓ Origin domain is correct (no http://, no port numbers)
2. ✓ Origin is publicly accessible
3. ✓ Origin protocol matches what your server supports
4. ✓ No IP restrictions blocking CloudFront
5. ✓ Origin responds to requests
6. ✓ SSL certificate is valid (if using HTTPS)

## Testing After Changes

After updating origin settings:
1. Wait 5-10 minutes for changes to propagate
2. Test with curl:
   ```bash
   curl -I https://d1c7tg6cmx1vrl.cloudfront.net/_next/static/chunks/main.js
   ```
3. Clear browser cache and retry

## Still Getting 502?

Enable CloudFront logging to see detailed error:
1. Distribution Settings → Logs → Edit
2. Enable Standard Logging
3. Wait for errors to appear in logs
4. Look for "OriginError" entries

The logs will show exactly why CloudFront cannot reach your origin.