import path from 'path';
import dotenv from 'dotenv';

// Must run before any module reads process.env (imports are hoisted in index.ts)
dotenv.config({ path: path.join(__dirname, '../../.env') });
