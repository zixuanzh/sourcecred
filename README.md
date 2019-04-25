# [SourceCred](https://sourcecred.io)

## SourceCred - Org Scores Sidebranch

This branch contains a prototype SourceCred workflow for producing cred scores
for entire organizations. It depends on code that hasn't yet been merged into
`master`, so expect lower quality, less documentation, and possible bugginess.


### Dependencies

  - Install [Node] (tested on v8.x.x).
  - Install [Yarn] (tested on v1.7.0).
  - Create a [GitHub API token]. No special permissions are required.

[Node]: https://nodejs.org/en/
[Yarn]: https://yarnpkg.com/lang/en/
[GitHub API token]: https://github.com/settings/tokens

### Installation and Setup

Run the following commands to clone and build SourceCred:

```
git clone https://github.com/sourcecred/sourcecred.git
cd sourcecred
git checkout org-scores-prototype
yarn install
yarn backend
export SOURCECRED_GITHUB_TOKEN=YOUR_GITHUB_TOKEN
```

### Download data for an organization

Next we should download data for your organization.
This will take a while. (Hours for large organizations.)

```
node bin/sourcecred.js load --organization ORG_NAME
```

### View the results in the browser

You can now see the resultant data by running `yarn start`
and navigating to the url it provides, and then clicking on
'prototypes' in the nav bar.

### Exporting data as JSON

Run the following commands to get the scores as JSON.

```
node bin/sourcecred.js pagerank ORG_NAME/combined
node bin/sourcecred.js scores ORG_NAME/combined
```

The latter command will print a JSON blob containing the username->score mapping
to stdout.

### Interpreting the scores

Cred scores are derived from running PageRank on a project's Git and GitHub data.
PageRank outputs a probability distribution over all the nodes in the graph.
To make the scores a little more readable, we re-normalize so that the users
collectively always have 1000 score. So a user with 10 cred has 1% of the total
cred for that project or organization.

### Caveats

#### Need for ad-hoc blacklisting

SourceCred fails on certain (mostly small) GitHub repos for reasons that I haven't yet
dug into. Characteristically, the failure will look like this:

```
❯ node bin/sourcecred.js load --organization multiformats

Starting tasks
  GO   load-git
  GO   load-github
 DONE  load-git
 FAIL  load-github
Exit code: 1
Contents of stderr:
    { owner: 'multiformats', name: 'multihash' }
    { owner: 'multiformats', name: 'multiformats' }
    { owner: 'multiformats', name: 'multiaddr' }
    { owner: 'multiformats', name: 'go-multihash' }
    { owner: 'multiformats', name: 'cid' }
    { owner: 'multiformats', name: 'multicodec' }
    { owner: 'multiformats', name: 'go-multiaddr' }
    { owner: 'multiformats', name: 'multibase' }
    { owner: 'multiformats', name: 'js-multihash' }
    { owner: 'multiformats', name: 'js-multiaddr' }
    { owner: 'multiformats', name: 'js-cid' }
    { owner: 'multiformats', name: 'multistream' }
    SqliteError: NOT NULL constraint failed: tmp_transitive_dependencies_1.typename
        at _inTransaction (/home/dandelion/code/sourcecred/sourcecred/bin/sourcecred.js:1516:14)
        at _inTransaction (/home/dandelion/code/sourcecred/sourcecred/bin/sourcecred.js:1640:142)
        at Mirror.extract (/home/dandelion/code/sourcecred/sourcecred/bin/sourcecred.js:1492:47)
        at fetchGithubRepo (/home/dandelion/code/sourcecred/sourcecred/bin/sourcecred.js:750:61)
        at process._tickCallback (internal/process/next_tick.js:68:7)


Overview
Failed tasks:
  - load-github
Final result:  FAILURE

```

If this occurs, you can hack around it by blacklisting the offending repo.
In this case, [multiformats/multistream](https://github.com/multiformats/multistream).
On line 154 in `src/cli/load.js`, there's a constant called `skipTheseRepos`
which has a number of small repos manually blacklisted. You can add more repos
to this list, and then rebuild via `yarn backend`.

#### Reference cred disabled

One nice feature of SourceCred is that it uses GitHub references as a rich source of signal
in determining how important activity is (comments, pulls, and issues earn more cred for
being referenced by other high-cred entities). Unfortunately, reference detection is buggy
when there are multiple repos in scope (numeric references like #123 may be attributed to
the wrong repository). As such, this prototype is configured so that references have 0 weight.


