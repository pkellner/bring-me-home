// s3-upload-test.js
// Run with: node s3-upload-test.js
// Make sure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION,
// and AWS_S3_BUCKET are set in your environment.

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

(async () => {

  console.log("Starting S3 upload test..." + process.env.AWS_S3_BUCKET + " " + process.env.AWS_REGION);

  // Uses credentials & region from environment variables
  const s3 = new S3Client({ region: process.env.AWS_REGION });

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,  // e.g. bring-me-home-bucket-prod
        Key: "debug/ping1.txt",              // any test key you like
        Body: Buffer.from("it works\n"),    // tiny text payload
      })
    );

    console.log("✅  Upload succeeded — credentials & policy are working!");
  } catch (err) {
    console.error("❌  Upload failed:", err);
  }
})();
