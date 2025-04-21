// metadata generator for commit and repository Nfts
// Debashish Buragohain

import { Commit, Repository } from "@prisma/client";
import { commitMetrics, CommitNftMetdata } from "../types/commit";
import { prisma } from "../prisma";
import { JsonValue } from "@prisma/client/runtime/library";
import { RepositoryMetadataWithAllRequiredFields, RepositoryMetdata, RepositoryNftCollectionMetadata } from "../types/repo";

// function to create the metadata of the commit Nft
export const createCommitMetadata = async (commit: Commit): Promise<CommitNftMetdata> => {
    const metadata: Partial<CommitNftMetdata> = {};
    metadata.commitHash = commit.commitHash;

    const branch = await prisma.branch.findUnique({ where: { id: commit.branchId } });
    if (!branch) {
        throw new Error("Commit's branch does not exist.");
    }
    metadata.branchName = branch.name;
    metadata.branchHash = branch.branchHash;

    const repo = await prisma.repository.findUnique({ where: { id: branch.repositoryId } });
    if (!repo) {
        throw new Error("Commit's repository does not exist.");
    }
    metadata.repositoryHash = repo.repoHash;
    metadata.repositoryName = repo.name;
    metadata.repositoryOwner = repo.ownerAddress;
    if (!repo.baseModelHash) {
        throw new Error("Commit's base model does not exist.");
    }
    metadata.baseModelHash = repo.baseModelHash;
    if (commit.status == 'MERGERCOMMIT') {
        throw new Error('Commit is a merger commit, and cannot be converted into an Nft.');
    }
    metadata.status = commit.status;
    metadata.sourceCommit = commit.previousMergerCommit;
    if (commit.status == 'MERGED') {
        if (!commit.relatedMergerCommit) {
            throw new Error('Reference to the merger commit not present in merged commit.');
        }
        metadata.mergedCommit = commit.relatedMergerCommit;
        // store the metrics of the related merger commit 
        const mergerCommit = await prisma.commit.findUnique({ where: { commitHash: commit.relatedMergerCommit } });
        if (!mergerCommit) {
            throw new Error('Related merger commit for accepted commit does not exist.');
        }
        metadata.mergedMetrics = parseMetrics(mergerCommit.metrics);
    }
    metadata.committer = commit.committerAddress;
    metadata.paramHash = commit.paramHash;
    metadata.message = commit.message;
    if (commit.status == 'REJECTED') {
        if (!commit.rejectedMessage) {
            throw new Error('Rejection message not present in rejected commit.');
        }
        metadata.messageIfRejected = commit.rejectedMessage;
    }
    metadata.createdAt = commit.createdAt.toISOString();
    metadata.localMetrics = parseMetrics(commit.metrics);
    return metadata as CommitNftMetdata;
}

// parse the metric values
export function parseMetrics(metric: JsonValue): commitMetrics {
    // Ensure metric is a valid object
    if (typeof metric !== "object" || metric === null || Array.isArray(metric)) {
        throw new Error("Invalid commit metrics: Expected an object.");
    }
    const { accuracy, loss } = metric as Record<string, unknown>;
    if (!accuracy) {
        throw new Error('Accuracy not present in commit metric.');
    }
    if (!loss) {
        throw new Error('Loss not present in commit metric.');
    }
    return { accuracy, loss } as commitMetrics;
}

// create the metadata for uploading in the collection
export const createRepositoryMetadata = async (repo: Repository): Promise<RepositoryNftCollectionMetadata> => {
    const metadata: Partial<RepositoryNftCollectionMetadata> = {};
    const { name, description, useCase, creator, framework, modelUri } = parseRepoMetadata(repo.metadata);
    metadata.name = name;
    metadata.description = description;
    metadata.useCase = useCase;
    metadata.creator = creator;
    metadata.framework = framework;
    metadata.modelUri = modelUri;
    metadata.createdAt = repo.createdAt.toISOString();
    metadata.owner = repo.ownerAddress;
    const { baseModelHash } = repo;
    if (!baseModelHash) {
        throw new Error('base model hash is a required field.');
    }
    metadata.baseModelHash = baseModelHash;
    return metadata as RepositoryNftCollectionMetadata;
}

// we cannot have undefined fields the metadata of the nft
export function parseRepoMetadata(repoMetadata: JsonValue): RepositoryMetadataWithAllRequiredFields {
    if (typeof repoMetadata !== "object" || repoMetadata === null || Array.isArray(repoMetadata)) {
        throw new Error("Invalid commit metrics: Expected an object.");
    }
    const { name, description, useCase, creator, framework, modelUri } = repoMetadata as Record<string, unknown>;
    if (!name || !description || !useCase || !creator || !framework || !modelUri) {
        throw new Error("Missing required repository metadata fields.");
    }
    return { name, description, useCase, creator, framework, modelUri } as RepositoryMetadataWithAllRequiredFields;
}

