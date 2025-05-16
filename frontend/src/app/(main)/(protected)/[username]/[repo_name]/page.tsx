'use client';

import Repositories from '@/components/dashboard/Repositories';
import ModelStats from '@/components/ModelStats';
import Readme from '@/components/Readme';
import { request } from '@/lib/requests';
import { set } from '@metaplex-foundation/umi/serializers';
import { ChevronRight, History, Pencil, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';

const Page = (props: { params: Promise<{ repo_name: string }> }) => {
  const { repo_name } = use(props.params);
  const repo_hash = '5345c1b8-49ff-4ece-8bdd-c44a8d7701ce';
  const [repoDetails, setRepoDetails] = useState<{
    name: string;
    description: string;
    creator: string;
    useCase: string;
    repoHash: string;
    framework: string;
    contributorIds: string[];
  } | null>(null);
  const [creatorDetails, setCreatorDetails] = useState<{
    username: string;
    name: string;
    id: string;
    profileImage: string;
  } | null>(null);
  const [branch, setBranch] = useState<{
    id: string;
    hash: string;
    name: string;
    description: string;
  } | null>(null);

  // --- About section ---
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [aboutText, setAboutText] = useState('');

  // --- Model URI section ---
  const [isEditingModelURI, setIsEditingModelURI] = useState(false);
  const [modelURI, setModelURI] = useState('');

  // --- Use Cases section ---
  const [isEditingUseCases, setIsEditingUseCases] = useState(false);
  const [useCases, setUseCases] = useState('');

  // --- Framework section ---
  // For simplicity, we'll treat this as a comma-separated text list.
  const [isEditingFramework, setIsEditingFramework] = useState(false);
  const [framework, setFramework] = useState('');

  // --- Contributors section ---
  const [isEditingContributors, setIsEditingContributors] = useState(false);
  const [contributors, setContributors] = useState<{ id: string; username: string }[]>([]);
  const [contributorIds, setContributorIds] = useState<string[]>([]);
  const [newContributorId, setNewContributorId] = useState<string>('');
  const [addContributorIds, setAddContributorIds] = useState<string[]>([]);
  const [removeContributorIds, setRemoveContributorIds] = useState<string[]>([]);

  const handleRemoveContributor = (id: string) => {
    setRemoveContributorIds(prev => [...prev, id]);
  };

  const handleAddContributor = () => {
    setAddContributorIds(prev => [...prev, newContributorId]);
    setNewContributorId('');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await request({
          method: 'GET',
          // url: `${process.env.NEXT_PUBLIC_API_URL}/repo/name/${repo_name}`,
          url: `${process.env.NEXT_PUBLIC_API_URL}/repo/hash/${repo_hash}`,
          action: 'signin',
        });
        const data = await response.json();
        console.log('Repo Details:', data);
        setRepoDetails({
          name: data.data.name,
          description: data.data.metadata.description,
          creator: data.data.metadata.creator,
          useCase: data.data.metadata.useCase,
          framework: data.data.metadata.framework,
          repoHash: data.data.repoHash,
          contributorIds: data.data.contributorIds,
        });
      } catch (err) {
        console.log('Error in Fetching Repo Details:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (repoDetails) {
      setAboutText(repoDetails.description);
      setFramework(repoDetails.framework);
      setUseCases(repoDetails.useCase);
      setContributorIds(repoDetails.contributorIds);

      const fetchContributors = async (id: string) => {
        try {
          const response = await request({
            method: 'GET',
            url: `${process.env.NEXT_PUBLIC_API_URL}/user/user/${id}`,
            action: 'signin',
          });
          const data = await response.json();
          return data.data.username;
        } catch (err) {
          console.log('Error in fetching contributors data', err);
        }
      };
      setContributors([]);
      for (const id of repoDetails.contributorIds) {
        fetchContributors(id)
          .then(username => {
            setContributors(prev => [...prev, { id, username }]);
          })
          .catch(err => {
            console.log('Error in fetching contributors data', err);
          });
      }

      const fetchCreator = async () => {
        try {
          const response = await request({
            method: 'GET',
            url: `${process.env.NEXT_PUBLIC_API_URL}/user/user/${repoDetails.creator}`,
            action: 'signin',
          });
          const data = await response.json();
          console.log('Creator Details:', data);
          setCreatorDetails({
            username: data.data.username,
            name: data.data.metadata.name,
            id: data.data.id,
            profileImage: data.data.metadata.profileImage,
          });
        } catch (err) {
          console.log('Error in Fetching Creators Data', err);
        }
      };
      fetchCreator();

      const fetchBranch = async () => {
        try {
          const response = await request({
            method: 'GET',
            url: `${process.env.NEXT_PUBLIC_API_URL}/repo/hash/${repo_hash}/branch`,
            action: 'signin',
          });
          const data = await response.json();
          setBranch({
            id: data.data.id,
            hash: data.data.branchHash,
            name: data.data.name,
            description: data.data.description,
          });
          console.log('Branch Details', data);
        } catch (err) {
          console.log('Error in fetching the branch', err);
        }
      };
      fetchBranch();
    }
  }, [repoDetails]);

  const handleSave = async () => {
    // NOt working
    const response = await request({
      method: 'PATCH',
      url: `${process.env.NEXT_PUBLIC_API_URL}/repo/hash/${repoDetails?.repoHash}/update`,
      data: {
        metadata: {
          name: repoDetails?.name,
          description: aboutText,
          framework: framework,
          useCase: useCases,
          creator: repoDetails?.creator,
        },
        addContributorIds: addContributorIds,
        removeContributorIds: removeContributorIds,
      },
      action: 'signin',
    });
    const data = await response.json();
    console.log('Updated Repo Details:', data);
    setRepoDetails({
      name: data.data.name,
      description: data.data.metadata.description,
      creator: data.data.metadata.creator,
      useCase: data.data.metadata.useCase,
      framework: data.data.metadata.framework,
      repoHash: data.data.repoHash,
      contributorIds: data.data.contributorIds,
    });
    setIsEditingAbout(false);
    setIsEditingFramework(false);
    setIsEditingContributors(false);
    setIsEditingUseCases(false);
    setIsEditingModelURI(false);
  };

  return (
    <section className="min-h-screen bg-[#0d1117] w-full pt-20 px-32">
      <div className="flex items-center gap-4 border-b border-gray-500 pb-3 px-10">
        <Image
          className="rounded-full h-10 w-10"
          src={'/dummy/profile.png'}
          // src={creatorDetails?.profileImage ? creatorDetails?.profileImage : '/dummy/profile.png'}
          width={40}
          height={40}
          alt="creatorAvatar"
        />
        <h2 className="text-xl font-semibold text-white">{repo_name}</h2>
        <div className="flex-grow"></div>
      </div>
      <div className="flex justify-center items-start mt-8">
        <div className="flex-grow px-4 flex flex-col gap-6">
          {/* Latest Commit + Number of Commits */}
          <div className="flex items-center py-2 px-4 rounded-lg w-full h-12 bg-gray-800">
            <div className="flex items-center gap-2">
              <Image
                className="h-8 w-8 rounded-full"
                src={'/dummy/profile.png'}
                width={16}
                height={16}
                alt="avater"
              ></Image>
              <h4 className="text-sm text-gray-300 font-bold">
                johnCena{' '}
                <span className="font-normal text-gray-400"> trained on a lot of data </span>
              </h4>
            </div>
            <div className="flex-grow-1"></div>
            {/* TODO: navigate to another page where all the commits will be displayed */}
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <History size={20} />
              <p className="">15 Commits</p>
              <Link
                href={`/${'hirak'}/${repo_name}/commits`}
                className="text-gray-400 hover:text-blue-400"
              >
                <ChevronRight /> {}
              </Link>
            </div>
          </div>

          <Readme readme="Readme content goes here" />
        </div>

        <div className="min-w-80 h-full border-l border-gray-500 p-4 pl-8 flex flex-col gap-4">
          {/* Model Stats */}
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-white">Model Stats</h3>
            <ModelStats accuracy={0.75} loss={0.15} />{' '}
          </div>
          <hr className="border-gray-500" />
          {/* About Section */}
          {aboutText && (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between w-full">
                  <h3 className="text-lg font-semibold text-white">About</h3>
                  <button
                    onClick={() => setIsEditingAbout(!isEditingAbout)}
                    className="hover:text-blue-400"
                  >
                    {}
                    {isEditingAbout ? <X size={16} /> : <Pencil size={16} />}
                  </button>
                </div>
                {isEditingAbout ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      style={{ scrollbarWidth: 'none' }}
                      placeholder="Write about the model..."
                      value={aboutText}
                      onChange={e => setAboutText(e.target.value)}
                      className="w-full bg-[#0d1117] text-sm text-gray-500 border border-gray-600 p-2 rounded-md focus:outline-none"
                      rows={5}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{aboutText}</p>
                )}
              </div>
              <hr className="border-gray-500" />
            </>
          )}
          {/* Model URI Section
          {modelURI && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between w-full">
                <h3 className="text-lg font-semibold text-white">Model URI</h3>
                <button
                  onClick={() => setIsEditingModelURI(!isEditingModelURI)}
                  className="hover:text-blue-400"
                >
                  {isEditingModelURI ? <X size={16} /> : <Pencil size={16} />}
                </button>
              </div>
              {isEditingModelURI ? (
                <div className="flex flex-col gap-2">
                  <input
                    placeholder="https://example.com/model-uri"
                    type="text"
                    value={tempModelURI}
                    onChange={e => setTempModelURI(e.target.value)}
                    className="w-full bg-[#0d1117] text-sm text-gray-300 border border-gray-600 p-2 rounded-md focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave('modelURI')}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-400"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href={`https://${modelURI}`}
                  className="text-sm text-blue-500"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {modelURI}
                </Link>
              )}
            </div>
          )}
          <hr className="border-gray-500" /> */}
          {/* Use Cases Section */}
          {useCases && (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between w-full">
                  <h3 className="text-lg font-semibold text-white">Use Cases</h3>
                  <button
                    onClick={() => setIsEditingUseCases(!isEditingUseCases)}
                    className="hover:text-blue-400"
                  >
                    {isEditingUseCases ? <X size={16} /> : <Pencil size={16} />}
                  </button>
                </div>
                {isEditingUseCases ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      placeholder="Write about the use cases..."
                      style={{ scrollbarWidth: 'none' }}
                      value={useCases}
                      onChange={e => setUseCases(e.target.value)}
                      className="w-full bg-[#0d1117] text-sm text-gray-500 border border-gray-600 p-2 rounded-md focus:outline-none"
                      rows={5}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{useCases}</p>
                )}
              </div>
              <hr className="border-gray-500" />
            </>
          )}
          {/* Framework Section */}
          {framework && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between w-full">
                <h3 className="text-lg font-semibold text-white">Framework</h3>
                <button
                  onClick={() => setIsEditingFramework(!isEditingFramework)}
                  className="hover:text-blue-400"
                >
                  {isEditingFramework ? <X size={16} /> : <Pencil size={16} />}
                </button>
              </div>
              {isEditingFramework ? (
                <div className="flex flex-col gap-2">
                  <input
                    placeholder="e.g. TensorFlow, PyTorch"
                    type="text"
                    value={framework}
                    onChange={e => setFramework(e.target.value)}
                    className="w-full bg-[#0d1117] text-sm text-gray-300 border border-gray-600 p-2 rounded-md focus:outline-none"
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  {framework.split(',').map((fw, index) => (
                    <span
                      key={index}
                      className="bg-gray-700 px-2 py-1 rounded text-sm text-gray-300"
                    >
                      {fw.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}{' '}
          <hr className="border-gray-500" />
          {/* Contributors Section */}
          {contributorIds && (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between w-full">
                  <h3 className="text-lg font-semibold text-white">Contributors</h3>
                  <button
                    onClick={() => setIsEditingContributors(!isEditingContributors)}
                    className="hover:text-blue-400"
                  >
                    {isEditingContributors ? <X size={16} /> : <Pencil size={16} />}
                  </button>
                </div>

                {isEditingContributors ? (
                  <div className="flex flex-col gap-3">
                    {/* Existing contributors with remove option */}
                    <div className="flex flex-wrap gap-2">
                      {contributorIds.map((contributorId, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded text-sm text-gray-300"
                        >
                          <span>{contributorId}</span>
                          <button
                            onClick={() => handleRemoveContributor(contributorId)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <X size={14} />
                            {}
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Input to add a new contributor */}
                    <div className="flex gap-2 items-center">
                      <input
                        placeholder="Enter contributor ID"
                        type="text"
                        value={newContributorId}
                        onChange={e => setNewContributorId(e.target.value)}
                        className="w-full bg-[#0d1117] text-sm text-gray-300 border border-gray-600 p-2 rounded-md focus:outline-none"
                      />
                      <button
                        onClick={handleAddContributor}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-400"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {contributors.map(({ id, username }) => (
                      <Link
                        key={id}
                        href={`/${username}`}
                        className="bg-gray-700 px-2 py-1 rounded text-sm text-gray-300"
                      >
                        {username}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <hr className="border-gray-500" />
              {(isEditingAbout ||
                isEditingContributors ||
                isEditingFramework ||
                isEditingModelURI ||
                isEditingUseCases) && (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-400"
                  >
                    Save
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Page;
