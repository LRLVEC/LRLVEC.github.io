struct Parameter
{
    dt : f32,
    G : f32,
    num : u32,
};

struct Particle
{
    position : vec3f,
    mass : f32,
    velocity : vec3f,
};

struct VertexOutput
{
    @builtin(position) position : vec4f,
    @location(0) color : vec3f,
};

@group(0) @binding(0) var<uniform> params : Parameter;
@group(0) @binding(1) var<storage, read> particles_read : array<Particle>;
@group(0) @binding(2) var<storage, read_write> particles : array<Particle>;

@compute @workgroup_size(256) fn updata_velocity(@builtin(global_invocation_id) id : vec3<u32>)
{
    if (id.x < params.num)
    {
        var c0 : u32 = 0;
        var r : vec3f = particles[id.x].position;
        var dv : vec3f = vec3f(0);
        for(; c0 < id.x; c0++)
        {
            var dr : vec3f = particles[c0].position - r;
            dv += (particles[c0].mass / (pow(dot(dr, dr), 1.5) + 0.00001)) * dr;
        }
        for(c0++; c0 < params.num; c0++)
        {
            var dr : vec3f = particles[c0].position - r;
            dv += (particles[c0].mass / (pow(dot(dr, dr), 1.5) + 0.00001)) * dr;
        }
        particles[id.x].velocity += dv * params.G * params.dt;
    }
}

@compute @workgroup_size(256) fn update_pos(@builtin(global_invocation_id) id : vec3<u32>)
{
    if (id.x < params.num)
    {
        particles[id.x].position += params.dt * particles[id.x].velocity;
    }
}

@vertex fn vertexMain(@builtin(vertex_index) id : u32) -> VertexOutput
{
    var out : VertexOutput;
    out.position = vec4f(0.2 * particles_read[id].position.zx, 0, 1);
    var k : f32 = tanh(length(particles_read[id].velocity) / 15);
    out.color = vec3f(1 - k, k, k);
    return out;
}

@fragment fn fragmentMain(in : VertexOutput) -> @location(0) vec4f
{
    //let linear_color = pow(in.color, vec3f(2.2));
    return vec4f(in.color, 1.0);
}
