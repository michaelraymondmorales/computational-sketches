varying vec3 vWorldPos;
varying vec3 vCamPos;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    vCamPos = cameraPosition;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}