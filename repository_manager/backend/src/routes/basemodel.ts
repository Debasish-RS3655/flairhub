// route to handle base model uploads, downloads and deletes
// Debashish Buragohain

import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { uploader } from '../lib/multer/index.js';
import { unpinFromIpfs, uploadToIpfs } from '../lib/ipfs/pinata.js';
import { authorizedPk } from '../middleware/auth/authHandler.js';
import { prisma } from '../lib/prisma/index.js';
import { existingModelCheck } from '../middleware/upload/existingModelCheck.js';
import { clearDirBeforeUpload } from '../middleware/upload/clearTemp.js';

const modelRouter = Router();

// sends a model to the backend for uploading to the frontend
modelRouter.post('/upload', existingModelCheck, clearDirBeforeUpload, uploader, async (req, res) => {
    try {
        // first do a check that the user is actually uploading to his model only
        const pk = authorizedPk(res);
        const repo = await prisma.repository.findUnique({
            where: { id: req.repoId }, include: {
                branches: true
            }
        });
        if (!repo) {
            res.status(400).send({ error: { message: 'Repository does not exist to upload the base model into.' } });
            return;
        }
        if (repo.baseModelHash && repo.branches) {
            res.status(400).send({ error: { message: 'Model already uploaded to repository. ' } })
            return;
        }
        if (repo.ownerAddress !== pk) {
            res.status(401).send({ error: { message: "You cannot upoad to someone else's repository." } });
            return;
        }

        if (!req.file) {
            console.error('File not saved to /tmp/uploads.');
            res.status(500).send({ error: { message: 'No file uploaded!' } });
            return;
        }
        // reached here means the file is saved in the folder
        const modelPath = path.join(req.file.destination, req.file.filename);
        if (!fs.existsSync(modelPath)) {
            console.error('Error: File does not exists for uploading to IPFS.');
            res.status(500).send({ error: { message: 'Internal Server Error.' } });
            return;
        }
        // start the uploading of the model
        const cid = await uploadToIpfs(modelPath);
        if (!cid) {
            res.status(500).send({ error: { message: `Could not upload to IPFS.` } });
            return;
        }
        await prisma.repository.update({
            where: { id: req.repoId! },
            data: {
                baseModelHash: cid,
                updatedAt: new Date()
            }
        });
        res.status(200).json({ data: { cid } });
        return;
    }
    catch (err) {
        console.error('Could not upload file to IPFS:', err);
        res.status(500).send({ error: { message: 'Could not upload file to IPFS.' } });
        return;
    }
});

// if the repo has commits, you delete the repository then the model gets deleted
modelRouter.delete('/delete', existingModelCheck, async (req, res) => {
    try {
        // first check if the same model hash is present in more than one repos
        const currentRepo = await prisma.repository.findUnique({
            where: { id: req.repoId }
        });
        if (!currentRepo) {
            res.status(404).send({ error: { message: 'Repository does not exist.' } });
            return;
        }
        if (!currentRepo.baseModelHash) {
            res.status(400).send({ error: { message: 'No base model to delete in the repository.' } });
            return;
        }
        const reposWithThisModel = await prisma.repository.count({
            where: { repoHash: currentRepo.baseModelHash }
        });
        // if this is the only repo with the model actually unpin the model from IPFS
        if (reposWithThisModel <= 1) {
            // give the request to unpin the model from IPFS
            const status = await unpinFromIpfs(currentRepo.baseModelHash);
            if (status.toLowerCase().includes('error')) {
                console.error(`Error unpinning model from IPFS`);
                res.status(500).send({ error: { message: 'Could not unpin model from IPFS.', status } });
                return;
            }
        }
        // finally delete the reference of the model from the repository
        await prisma.repository.update({
            where: { id: req.repoId },
            data: {
                baseModelHash: null,
                updatedAt: new Date()
            }
        });
        // means the model is deleted from the repository
        res.status(200).json({ data: currentRepo.baseModelHash });
    }
    catch (err: any) {
        console.error('Could not delete model: ', err);
        res.status(400).send({ error: { message: err.message } });
        return;
    }
});

// maybe during production we are going to have multiple gateway URLs then we'll choose the best one out of that
export function constructIPFSUrl(cid: string) {
    const gatewayUrl = process.env.GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";
    const url = `${gatewayUrl}/${cid}`;
    return url;
}

// get the fetchUrl for the model from IPFS
modelRouter.get('/fetch_url', async (req, res) => {
    const { repoId } = req;
    const repo = await prisma.repository.findUnique({ where: { id: repoId } });
    if (!repo) {
        res.status(404).send({ error: { message: 'Repository does not exist.' } });
        return;
    }
    if (!repo.baseModelHash) {
        res.status(400).send({ error: { message: 'Repository does not contain a base model.' } });
        return;
    }
    const url = constructIPFSUrl(repo.baseModelHash);
    res.status(200).json({ data: url });
});

export { modelRouter };