async function listTasks() {
    const endpoint = `${API_URI}/tasks`;
    const response = await fetch(endpoint);

    assert(response.status < 400);

    const resource = await response.json();

    assert('names' in resource);

    console.info('Got valid response on endpoint', endpoint);
    return resource;
}

function routeToTaskPage(task) {
    return `/static/html/${task}.html`
}

function render_tasks($container, $template, tasks) {
    console.info('Rendering tasks', tasks);

    for (const task of tasks) {
        const $item = $template.clone(true)
            .removeAttr('id');

        $item.find('#task-link')
            .attr('href', routeToTaskPage(task))
            .text(task);

        $container.append($item);
    }
}


$(document).ready(async () => {
    const tasksResource = await listTasks();
    const $container = $('#task-list');
    const $template = $('#task-item-templ');

    render_tasks($container, $template, tasksResource.names);
});

