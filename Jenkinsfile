// ResideFix — Jenkins CI pipeline (Ubuntu lab PC)
//
// Every branch: backend tests, frontend lint/test/build, and (when Docker is usable)
// a Docker image build plus a full-stack smoke test on a separate port.
//
// Made for a locked-down lab PC: it needs NO sudo and NO extra Jenkins plugins.
//   - Node.js: uses the PC's node if it is v22+, otherwise downloads Node into the
//     Jenkins user's home folder (~/.cache/residefix-ci) once and reuses it.
//   - Docker:  if the Jenkins user cannot run Docker, the Docker stages are skipped
//     (shown as "skipped", not failed) and the backend API tests that need MongoDB
//     report as skipped. Everything else still runs.
// It never touches Jenkins (port 8080) or a running ResideFix stack or its data.
// Setup guide: docs/JENKINS.md

// Runs a shell command with the downloaded Node (if any) first on PATH.
def runSh(String cmd) {
    sh(env.NODE_BIN ? "export PATH=\"${env.NODE_BIN}:\$PATH\"\n${cmd}" : cmd)
}

// Fails the build unless the URL answers with HTTP 2xx (uses Node, so curl is not needed).
def httpCheck(String url) {
    runSh """node -e "fetch('${url}').then(async r => { console.log(r.status, '${url}'); if (!r.ok) process.exit(1); }).catch(e => { console.error(e.message); process.exit(1); })" """
}

pipeline {
    // The lab's Docker-enabled agent. Jenkins' built-in node has no Docker access, so
    // without this the Docker stages would be skipped. Change it in "Build with Parameters"
    // (e.g. to "built-in") if the agent is offline.
    agent { label "${params.AGENT_LABEL ?: 'rootless-user-agent'}" }

    parameters {
        string(name: 'AGENT_LABEL', defaultValue: 'rootless-user-agent',
               description: 'Jenkins agent (node name or label) to run on')
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    triggers {
        // The lab PC is not reachable from GitHub, so poll instead of using a webhook.
        // Set here, not in the job's Configure page: each run resets triggers to this value.
        pollSCM('* * * * *')   // every minute
    }

    environment {
        NODE_VERSION   = '24.15.0'
        // Throwaway MongoDB for the API tests (database name must contain "test").
        CI_MONGO_PORT  = '27027'
        TEST_MONGO_URI = 'mongodb://127.0.0.1:27027/residefix_test'
        // Smoke-test stack runs as its own Compose project on its own port.
        SMOKE_PROJECT  = 'residefix-ci'
        SMOKE_PORT     = '18080'
        npm_config_cache = "${WORKSPACE}/.npm-cache"
    }

    stages {
        stage('Tools') {
            steps {
                script {
                    def hasNode = sh(returnStatus: true,
                        script: 'node --version 2>/dev/null | grep -Eq "^v(2[2-9]|[3-9][0-9])\\."') == 0
                    if (!hasNode) {
                        def home = sh(returnStdout: true, script: 'echo "$HOME"').trim()
                        def nodeDir = "${home}/.cache/residefix-ci/node-v${env.NODE_VERSION}"
                        echo "Node.js 22+ not found on PATH; using ${nodeDir}"
                        sh """
                            set -e
                            if [ ! -x "${nodeDir}/bin/node" ]; then
                              case "\$(uname -m)" in
                                x86_64) ARCH=x64 ;;
                                aarch64|arm64) ARCH=arm64 ;;
                                *) echo "Unsupported CPU: \$(uname -m)"; exit 1 ;;
                              esac
                              URL="https://nodejs.org/dist/v${env.NODE_VERSION}/node-v${env.NODE_VERSION}-linux-\$ARCH.tar.gz"
                              echo "Downloading \$URL"
                              rm -rf "${nodeDir}.tmp" && mkdir -p "${nodeDir}.tmp"
                              if command -v curl >/dev/null; then curl -fsSL "\$URL" -o node.tar.gz
                              else wget -q "\$URL" -O node.tar.gz; fi
                              tar -xzf node.tar.gz -C "${nodeDir}.tmp" --strip-components=1
                              rm -f node.tar.gz
                              rm -rf "${nodeDir}" && mv "${nodeDir}.tmp" "${nodeDir}"
                            fi
                        """
                        env.NODE_BIN = "${nodeDir}/bin"
                    }

                    env.HAS_DOCKER = sh(returnStatus: true,
                        script: 'docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1') == 0 ? 'true' : 'false'
                    if (env.HAS_DOCKER == 'true') {
                        runSh 'docker compose version'
                    } else {
                        echo 'Docker is not usable by the Jenkins user: Docker stages will be skipped and MongoDB API tests will report as skipped.'
                    }
                }
                runSh 'node --version && npm --version'
            }
        }

        stage('Install') {
            parallel {
                stage('Backend deps')  { steps { dir('backend')  { runSh 'npm ci --no-audit --no-fund' } } }
                stage('Frontend deps') { steps { dir('frontend') { runSh 'npm ci --no-audit --no-fund' } } }
            }
        }

        stage('Test') {
            parallel {
                stage('Backend tests') {
                    steps {
                        script {
                            if (env.HAS_DOCKER == 'true') {
                                withEnv(["DEV_MONGO_PORT=${env.CI_MONGO_PORT}"]) {
                                    runSh "docker compose -f compose.dev.yaml -p ${env.SMOKE_PROJECT}-mongo up -d --wait --wait-timeout 120"
                                }
                            }
                        }
                        dir('backend') { runSh 'npm test' }
                    }
                    post {
                        always {
                            script {
                                if (env.HAS_DOCKER == 'true') {
                                    runSh "docker compose -f compose.dev.yaml -p ${env.SMOKE_PROJECT}-mongo down -v"
                                }
                            }
                        }
                    }
                }
                stage('Frontend lint, test, build') {
                    steps {
                        dir('frontend') {
                            runSh 'npm run lint'
                            runSh 'npm test'
                            runSh 'npm run build'
                        }
                    }
                    post {
                        success { archiveArtifacts artifacts: 'frontend/dist/**', fingerprint: true }
                    }
                }
            }
        }

        stage('Docker build') {
            when { environment name: 'HAS_DOCKER', value: 'true' }
            steps {
                runSh 'docker compose build'
            }
        }

        stage('Smoke test') {
            when { environment name: 'HAS_DOCKER', value: 'true' }
            steps {
                withEnv(["RESIDEFIX_PORT=${env.SMOKE_PORT}"]) {
                    runSh "docker compose -p ${env.SMOKE_PROJECT} up -d --wait --wait-timeout 180"
                }
                httpCheck "http://localhost:${env.SMOKE_PORT}/"
                httpCheck "http://localhost:${env.SMOKE_PORT}/dashboard"
                httpCheck "http://localhost:${env.SMOKE_PORT}/api/health/ready"
            }
            post {
                failure { runSh "docker compose -p ${env.SMOKE_PROJECT} logs --tail 100" }
                // -v is safe here: this is the throwaway CI project, not real data.
                always  { runSh "docker compose -p ${env.SMOKE_PROJECT} down -v" }
            }
        }
    }

    post {
        success { echo 'ResideFix CI passed.' }
        failure { echo 'ResideFix CI failed. See the stage logs above.' }
    }
}
