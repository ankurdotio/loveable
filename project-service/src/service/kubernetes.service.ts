import * as k8s from "@kubernetes/client-node"
import { response } from "express";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);


export async function createPod(podName: string) {

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
                    }
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
                    protocol: 'TCP',
                    port: 80,
                    targetPort: 3000
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