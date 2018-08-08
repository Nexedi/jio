import { jIO } from './jio';
import { MemoryStorage } from './jio.storage/memorystorage';

jIO.addStorage('memory', MemoryStorage);

export default jIO;

export {
  jIO
};
