function createElement(types, props, ...children) {
    return {
        types,
        props: {
            ...props,
            children: children.map(child => typeof child === 'object' ? child : createTextElement(child))
        },
    }
}

function createTextElement(text) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: text,
            children: [],
        },
    }
}

function createDom(fibre) {
    const dom = fibre.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(fibre.type)

    const isProperty = key => key !== "children"
    Object.keys(fibre.props).filter(isProperty).forEach(name => {
        dom[name] = fibre.props[name]
    })
    return dom
    
}

function commitRoot() {
    commitRoot(progressRoot.child)
    currentRoot = progressRoot
    progressRoot = null
}

function commitWork(fibre) {
    if(!fibre) return
    const domParent = fibre.parent.dom
    domParent.appendChild(fibre.dom)
    commitWork(fibre.child)
    commitWork(fibre.sibling)
}

function render(element, container) {
    progressRoot = {
        dom: container,
        props: {
            children: [element]
        },
        alternate: currentRoot,
    }
    nextUnitOfWork = progressRoot
}

let nextUnitOfWork = null;
let currentRoot = null;
let progressRoot = null;

function threadLoop(deadline) {
    let shouldYield = false;

    while(nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
        shouldYield = deadline.timeRemaining < 1
    }
    requestIdleCallback(threadLoop)
}

requestIdleCallback(threadLoop)

function performUnitOfWork(fibre) {

    // Adding DOM node
    if(!fibre.dom) {
        fibre.dom = createDom(fibre)
    }
    

    //Creating new fibres
    const elements = fibre.props.children
    let index = 0
    let prevSibling = null

    while(index < elements.length) {
        const element = elements[index]

        const newFibre = {
            type: element.type,
            props: element.props,
            parent: fibre,
            dom: null
        }
        if(index === 0) {
            fibre.child = newFibre
        } else {
            prevSibling.sibling = newFibre
        }

        prevSibling = newFibre
        index++
    }

    //Return next unit of work
    if(fibre.child) {
        return fibre.child
    }
    let nextFibre = fibre
    while(nextFibre) {
        if(nextFibre.sibling) {
            return nextFibre.sibling
        }
        nextFibre = nextFibre.parent
    }
}

const Reenact = {
    createElement,
    render
}

/** @jsx Reenact.createElement */
const element = (
    <div id="foo">
        <a>bar</a>
        <b />
    </div>
)

const container = document.getElementById("root")
Reenact.render(element, container)