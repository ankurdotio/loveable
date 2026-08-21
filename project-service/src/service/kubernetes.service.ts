import * as k8s from "@kubernetes/client-node"

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);


export async function createPod(podName: string, projectId: string) {

    const podManifest = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
            name: podName,
            labels: {
                app: podName
            }
        },
        spec: {
            volumes: [
                {
                    name: 'app-volume',
                    emptyDir: {} // This creates an empty directory for the pod
                }
            ],
            initContainers: [
                {
                    name: 'init-container',
                    image: "nextjs-boilerplate",
                    command: ['sh', '-c', 'mkdir -p /app-copy && cp -r /app/* /app-copy'],
                    volumeMounts: [
                        {
                            name: 'app-volume',
                            mountPath: '/app-copy'
                        }
                    ]
                }
            ],
            containers: [
                {
                    name: 'nextjs-container',
                    image: 'nextjs-boilerplate',
                    ports: [
                        {
                            containerPort: 3000
                        }
                    ],
                    resources: {
                        requests: {
                            memory: '1024Mi',   // Minimum memory guaranteed
                            cpu: '500m'       // Minimum CPU guaranteed (0.5 cores)
                        },
                        limits: {
                            memory: '2048Mi',  // Maximum memory allowed before OOMKilled
                            cpu: '1000m'       // Maximum CPU allowed before throttling
                        }
                    },
                    volumeMounts: [
                        {
                            name: 'app-volume',
                            mountPath: '/app'
                        }
                    ]
                },
                {
                    name: 'file-server-container',
                    image: 'express-file-server',
                    ports: [
                        {
                            containerPort: 8080
                        }
                    ],
                    resources: {
                        requests: {
                            memory: '512Mi',   // Minimum memory guaranteed
                            cpu: '250m'       // Minimum CPU guaranteed (0.25 cores)
                        },
                        limits: {
                            memory: '1024Mi',  // Maximum memory allowed before OOMKilled
                            cpu: '500m'       // Maximum CPU allowed before throttling
                        }
                    },
                    volumeMounts: [
                        {
                            name: 'app-volume',
                            mountPath: '/app'
                        }
                    ],

                },
                {
                    name: 'sync-container',
                    image: 'sync-service',
                    env: [
                        {
                            name: "PROJECT_ID",
                            value: projectId
                        }
                    ]
                }
            ]
        }
    };

    const response = await k8sApi.createNamespacedPod({
        namespace: "default",
        body: podManifest
    });

    console.log('Pod successfully created!');
    console.log(response);
}

export async function createService(serviceName: string, podName: string) {

    const serviceManifest = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
            name: serviceName,
            labels: {
                app: podName
            }
        },
        spec: {
            selector: {
                app: podName
            },
            ports: [
                {
                    name: 'preview-port',
                    protocol: 'TCP',
                    port: 80,
                    targetPort: 3000
                },
                {
                    name: 'file-server-port',
                    protocol: 'TCP',
                    port: 8000,
                    targetPort: 8080
                }
            ],
            type: 'LoadBalancer'
        }
    };

    const response = await k8sApi.createNamespacedService({
        namespace: "default",
        body: serviceManifest
    });

    console.log('Service successfully created!');
    console.log(response);
}

/** True when the Kubernetes API rejected the request because the object is gone. */
function isNotFound(error: unknown) {
    return (error as { code?: number })?.code === 404
}

/**
 * Deletes a preview pod, treating an already-deleted pod as success.
 *
 * @param podName Name of the pod in the `default` namespace.
 */
export async function deletePod(podName: string) {
    try {
        await k8sApi.deleteNamespacedPod({ namespace: "default", name: podName })
        console.log(`Pod ${podName} deleted`)
    } catch (error) {
        if (isNotFound(error)) return
        throw error
    }
}

/**
 * Deletes a preview service, treating an already-deleted service as success.
 *
 * @param serviceName Name of the service in the `default` namespace.
 */
export async function deleteService(serviceName: string) {
    try {
        await k8sApi.deleteNamespacedService({ namespace: "default", name: serviceName })
        console.log(`Service ${serviceName} deleted`)
    } catch (error) {
        if (isNotFound(error)) return
        throw error
    }
}