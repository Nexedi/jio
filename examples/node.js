/*eslint no-console: "off"*/

const { jIO } = require('../dist/node/jio');

const tests = async () => {
  try {
    const memory = jIO.createJIO({
      type: 'memory'
    });
    console.log(memory.__type === 'memory');

    const id = await memory.put('1', {
      foo: 'bar'
    });
    console.log(id === '1');

    let results = await memory.allDocs();
    console.log(results.data.total_rows === 1);

    process.exit(0);
  }
  catch (err) {
    console.error('error', err);

    process.exit(1);
  }
};

tests();
