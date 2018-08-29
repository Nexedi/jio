const jIO = require('../../dist/jio-node-latest.js').jIO;

const storage = jIO.createJIO({
  type: 'drivetojiomapping',
  sub_storage: {
    type: 'dropbox',
    access_token: process.env.ACCESS_TOKEN
  }
});

const run = async () => {
  try {
    await storage.repair();

    const documents = await storage.allDocs({});
    console.log(documents);

    const attachmentId = `sample_${new Date().getTime()}`;
    const data = new Blob([JSON.stringify({title: "foo"})]);
    const attachment = await storage.putAttachment(attachmentId, 'enclosure', data);
    console.log(attachment);
  }
  catch (err) {
    console.error(err);
  }
};

run();
