// fsa.js

// rendering abstraction



class Renderer {

  // TODO: switch renderer based on graph library
  constructor(type) {
    this.type = type
  }



  renderGraph(data) {
    const width = 400
    const height = 400
    const nodeRadius = 20;

    $("#graph").html(`<svg width=${width} height=${height} viewbox="${-nodeRadius} ${-nodeRadius} ${width + 2 * nodeRadius} ${height + 2 * nodeRadius}"></svg>`)

    const svgSelection = d3.select("svg");
    const defs = svgSelection.append('defs'); // For gradients

    // Use computed layout
    let layout = d3.sugiyama()
                .debug(true)
                .size([width, height])
                // .layering(d3.layeringCoffmanGraham())
                // .decross(d3.decrossOpt())
                // .coord(d3.coordCenter())

    var dag = d3.dagStratify()(data);
    layout(dag);


    // How to draw edges
    const line = d3.line()
      .curve(d3.curveCatmullRom)
      .x(d => d.x)
      .y(d => d.y);

    // Plot edges
    const lineContainer = svgSelection.append('g');
    lineContainer.selectAll('path')
      .data(dag.links())
      .enter()
      .append('path')
      .attr('d', ({ data }) => line(data.points))
      .attr('fill', 'none')
      .attr('stroke-width', 3)
      .attr('stroke', ({source, target}) => {
        const gradId = `${source.id}-${target.id}`;
        const grad = defs.append('linearGradient')
          .attr('id', gradId)
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('x1', source.x)
          .attr('x2', target.x)
          .attr('y1', source.y)
          .attr('y2', target.y);
        grad.append('stop').attr('offset', '0%');
        grad.append('stop').attr('offset', '100%');

        return `url(#${gradId})`;
      });

      var text = lineContainer.selectAll("text")
                              .data(dag.links())
                              .enter()
                              .append("text")
                              .attr("x", function(d) {
                                return (d.source.x + d.target.x)/2.0 + 2.;
                              })
                              .attr("y", function(d) {
                                return (d.source.y + d.target.y)/2.0 + 2.;
                              })
                              .text( function (d) {
                                return linkData[d.source.id + "-" + d.target.id]
                              })
                              .attr("font-family", "sans-serif")
                              .attr("font-size", "20px")
                              .attr("fill", "red");



      // Select nodes
      const nodes = svgSelection.append('g')
        .selectAll('g')
        .data(dag.descendants())
        .enter()
        .append('g')
        .attr('transform', ({x, y}) => `translate(${x}, ${y})`);

      // Plot node circles
      nodes.append('circle')
        .attr('r', 20).attr('fill', 'black');

      // if(finalStates[n.id] == undefined) {
      nodes.append('circle')
          .attr('r', 18).attr('fill', 'white');
      // }
        // .attr('fill', n => colorMap[n.id]);

        // add arrows to edges
      const arrow = d3.symbol()
                  .type(d3.symbolTriangle)
                  .size(nodeRadius * nodeRadius / 5.0);

      const arrows = svgSelection.append('g')
      .selectAll('path')
      .data(dag.links())
      .enter()
      .append('path')
      .attr('d', arrow)
      .text(d => d.id)
      .attr('transform', ({
        source,
        target,
        data
      }) => {
        const [end, start] = data.points.reverse();
        // This sets the arrows the node radius (20) + a little bit (3) away from the node center, on the last line segment of the edge. This means that edges that only span ine level will work perfectly, but if the edge bends, this will be a little off.
        const dx = start.x - end.x;
        const dy = start.y - end.y;
        const scale = nodeRadius * 1.15 / Math.sqrt(dx * dx + dy * dy);
        // This is the angle of the last line segment
        const angle = Math.atan2(-dy, -dx) * 180 / Math.PI + 90;
        console.log(angle, dx, dy);
        return `translate(${end.x + dx * scale}, ${end.y + dy * scale}) rotate(${angle})`;
      })
      .attr('fill', ({target}) => 'black')
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5);

      // Add transition symbol to edge
      arrows.append('text')
        .text(d => d.id)
        .attr('font-weight', 'bold')
        .attr('font-family', 'sans-serif')
        .attr('text-anchor', 'left')
        .attr('alignment-baseline', 'left')
        .attr('fill', 'blue');

      // Add text to nodes
      nodes.append('text')
        .text(d => d.id)
        .attr('font-weight', 'bold')
        .attr('font-family', 'sans-serif')
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('fill', 'gray');

      return svgSelection;
    }

}

/////////////////////////////////////////////////////////////////////

// class definitions

class Transition {
  constructor(symbol, state) {
    this.symbol = symbol;
    this.state = state; // destination state
  }

}

class State {

    constructor(blob=null) {
        this.state_idx = STATE_INDEX++;
        this.tlist = [];
        this.blob_id = blob;
    }

    lastChild() {
      if(this.tlist.length == 0) {
        return nil;
      }

      return this.tlist[this.tlist.length-1].state;
    }

}

var graphData = []   // data used for rendering graph

var STATE_INDEX = 0
let FINAL_SYMBOL = 'ZZZZ'

let root = new State();
graphData.push({
  id :  "0" // for root node
});
renderer = new Renderer()
renderer.renderGraph(graphData);

var register = {};

// blob_value -> state
var blob_register = {};

// track final states so that they can be colored differently in the graph
var finalStates = {};

// used to plot the transition symbol on an edge
var linkData = {};


var register_table;
var blob_register_table;

$(document).ready(function() {
    register_table = $('#register').DataTable( {
        data: register,
        paging: false,
        searching: false,
        ordering:  false,
        info: false,
        columns: [
          { title: "Transition List" },
          { title: "State" },
        ]
    } );

    blob_register_table = $('#blob_register').DataTable( {
        data: blob_register,
        paging: false,
        searching: false,
        ordering:  false,
        info: false,
        columns: [
          { title: "Blob" },
          { title: "State" },
        ]
    } );
} );

function findPrefixLength(input) {
  let chars = input.split('');
  let currState = root;
  for(i = 0; i < chars.length; i++) {

    let symbol = chars[i];

    if(currState.tlist == 0) {
      return [i, currState];
    }

    let next_transition = currState.tlist.find( function(transition){
      return transition.symbol == symbol;
    });

    if(next_transition) {
      currState = next_transition.state;
    } else {
      return [i, currState]
    }
  }
}

function getTransitionKey(state) {
  var key = "";
  state.tlist
      .sort(function(lhs, rhs) {
          if (lhs.symbol < rhs.symbol)  {
            return 1;
          } else if (lhs.symbol > rhs.symbol) {
            return -1;
          } else {
            return 0;
          }
        })
        .forEach(function(transition) {
            key += (transition.symbol + "->" + transition.state.state_idx);
            key += " ";
          });
  return key;
}

function addLinkAndUpdateVisuals(currentState, newState, symbol) {

  graphData.push({
                  id:newState.state_idx,
                  parentIds: [currentState.state_idx]
                });


  // transition has already been added
  var key = getTransitionKey(currentState);


  register_table.row.add([
                            key,
                            currentState.state_idx
                          ]).draw(false);

  linkData[currentState.state_idx + '-' + newState.state_idx] = symbol;
  renderer.renderGraph(graphData);

}

function insertSuffix(currentState, suffix, blob_id) {
  let chars = suffix.split('');
  // add data to state in memory
  chars.forEach(function(symbol) {
    let state = new State(symbol);
    let previousKey = getTransitionKey(currentState);

    let transition = new Transition(symbol, state);
    currentState.tlist.push(transition);

    let newKey = getTransitionKey(currentState);

    addLinkAndUpdateVisuals(currentState, state, symbol, transition);

    if(register[previousKey] != undefined) {
      register.remove(previousKey);
    }

    register[newKey] =  currentState;
    currentState = state;

  });

  // finally add the blob
  let state = new State(blob_id);
  let transition = new Transition(FINAL_SYMBOL, state);
  currentState.tlist.push(transition);

  graphData.push({
                  id:state.state_idx,
                  parentIds: [currentState.state_idx]
                });

  linkData[currentState.state_idx + '-' + state.state_idx] = "ZZZZ";

  finalStates[state.state_idx] = state.state_idx;

  renderer.renderGraph(graphData);
  //blob_register[blob_id] = state;
  //blob_register_table.row.add([state.blob_id, state.state_idx]).draw();


  return currentState;

}

function removeNodeFromGraphData(state_idx) {
  graphData = graphData.filter(function(graphNode){
    return graphNode.id != state_idx;
  });
}

// start with the last child inserted - which is alwasy the rightmost child
// then backtrack
function replaceOrRegister(state) {

  if(state.tlist != undefined && state.tlist.length != 0) {
    replaceOrRegister(state.lastChild());
  }


  // if this is the final state , then check blob register
  if(state.tlist.length == 0) {

    if(blob_register[state.blob_id] != undefined) {

      let foundState = blob_register[state.blob_id] ;
      if(foundState.state_idx == state.state_idx) { // CAUTION: we just added this state;
        return;
      }

      // replace the blob
      state.tlist.state = blob_register[state.blob_id];

      // remove it from the graph
      removeNodeFromGraphData(state.state_idx);
      renderer.renderGraph(graphData);

      // add parent //////
      let node = graphData.find(function(node) {
        return node.id == state.state_idx;
      });
      foundState.parentIds.push(node.id);
      renderer.renderGraph(graphData);

          //////
      // grapData.push({
      //                 id:state.state_idx,
      //                 parentIds: [currentState.state_idx]
      //               });

    } else {
      blob_register[state.blob_id] = state;
      blob_register_table.row.add([state.blob_id, state.state_idx]).draw();
    }
  }


}

function insertSortedString(input, blob_id) {
  if(!input.length) {
    $('#status-bar').text('Input is empty');
    return;
  }

  $('#status-bar').text('Finding Prefix');
  let [prefixLength, currentState] = findPrefixLength(input);
  $('#status-bar').text('Prefix Length = ' + prefixLength);


  let suffix = input.substring(prefixLength);

  let lastInsertedState = insertSuffix(currentState, suffix, blob_id);

  replaceOrRegister(lastInsertedState);

}
