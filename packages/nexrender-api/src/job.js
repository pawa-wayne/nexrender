const EventEmitter = require('events');

const NEXRENDER_JOB_POLLING = process.env.NEXRENDER_JOB_POLLING || 3 * 1000;

const withEventEmitter = (fetch, job, polling = NEXRENDER_JOB_POLLING) => {
    const emitter  = new EventEmitter();
    const interval = setInterval(async () => {
        try {
            const updatedJob = await fetch(`/jobs/${job.uid}`)
            
            if (job.state != updatedJob.state) {
                job.state = updatedJob.state;
                emitter.emit(job.state, updatedJob, fetch);
            }
            
            if (updatedJob.renderProgress){
                emitter.emit('progress', updatedJob, updatedJob.renderProgress);
            }
            
            if (job.state == 'finished' || job.state == 'error') {
                if (job.state == 'finished'){
                    emitter.emit('progress', updatedJob, 100);
                }
                clearInterval(interval);
            }
        } catch (err) {
            clearInterval(interval);
            emitter.emit('error', err);
        }

    }, polling);

    /* trigger first callback */
    setImmediate(() => emitter.emit('created', job))

    return emitter;
}

module.exports = (fetch, polling) => ({
    listJobs: async () => await fetch(`/jobs`),

    addJob: async data =>
        withEventEmitter(fetch, await fetch(`/jobs`, {
            'method': 'post',
            'content-type': 'application/json',
            'body': JSON.stringify(data),
        }), polling),

    updateJob: async (id, data) =>
        await fetch(`/jobs/${id}`, {
            'method': 'put',
            'content-type': 'application/json',
            'body': JSON.stringify(data),
        }),

    removejob: async id =>
        await fetch(`/jobs/${id}`, {
            'method': 'delete'
        }),
})
