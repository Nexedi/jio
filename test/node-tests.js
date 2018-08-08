const { jIO } = require('../dist/jio-core');

const tests = async () => {
  const jio = jIO.createJIO({
    type: 'memory'
  });
  console.log(jio.__type === 'memory');

  const id = await jio.put('1', {
    foo: 'bar'
  });
  console.log(id === '1');

  const results = await jio.allDocs();
  console.log(results.data.total_rows === 1);
};

tests();
