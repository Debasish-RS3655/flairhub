// Solana Wallet Authenticated routing backend
// Debashish Buragohain

import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { signInContext } from './middleware/auth/index.js';
import {
  authHandler,
  // ByPassAuth
} from './middleware/auth/index.js';
import {
  authRouter,
  repoRouter,
  treeRouter,
  backendWalletRouter,
  userRouter,
} from './routes/index.js';
import { restrictToLocalHost } from './middleware/auth/restrictToLocalHost.js';

const PORT = parseInt(process.env.PORT!) || 4000;
const app = express();

// Middleware
app.use(morgan('combined'));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
})
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({
  limit: '10mb',
  extended: true
}));

// trust the proxy
app.set('trust proxy', true);
app.use('/auth', authRouter);
app.use('/user', authHandler(signInContext), userRouter);

// authorized routes
app.use(
  '/repo',
  // uncomment this when you want to bypass authentication
  // ByPassAuth(signInContext),
  authHandler(signInContext),
  repoRouter,
);

// backend wallet is restricted to be accessed only from localhost
app.use(
  '/systemWallet',
  authHandler(signInContext),
  // restrictToLocalHost,       uncomment to restrict this route only to the local host
  backendWalletRouter,
);

// for the tree route we need to attach the middlewares on individual routes
app.use('/tree', treeRouter);

// landing page
app.get('/', (req, res) => {
  res.status(200).json({
    "service": "FlairHub API",
    "status": "ok",
    "version": "1.0.0",
    "docs": "https://documenter.getpostman.com/view/44873202/2sB2qWG3xB",
    "endpoints": [
      {
        "path": "/auth/signin/{address}",
        "method": "GET",
        "description": "Fetch a sign-in message for the given wallet address"
      },
      {
        "path": "/auth/signin",
        "method": "POST",
        "description": "Submit signed token to authenticate and receive a session"
      },
      {
        "path": "/repo/create",
        "method": "POST",
        "description": "Create a new repository with metadata"
      },
      {
        "path": "/repo",
        "method": "GET",
        "description": "List all repositories accessible to the user"
      },
      {
        "path": "/repo/hash/{repoHash}",
        "method": "GET",
        "description": "Retrieve details of a repository by its hash"
      },
      {
        "path": "/repo/name/{name}",
        "method": "GET",
        "description": "Retrieve details of a repository by its name"
      }
    ]
  })
});

// Handle 404
app.all('*', (req, res, next) => {
  res.status(404).send({ error: '404 Not Found' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
