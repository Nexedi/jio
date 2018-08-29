const jIO = require('../../dist/jio-node-latest.js').jIO;

const storage = jIO.createJIO({
  type: 'memory'
});

const run = async () => {
  try {
    const id = await storage.put('1', {
      foo: 'bar'
    });
    console.log(id === '1');

    const results = await storage.allDocs();
    console.log(results.data.total_rows === 1);

    const doc = await storage.get('1');
    console.log(doc);
  }
  catch (err) {
    console.error(err);
  }
};

run();
