import { useRef, useState } from "react";
import "./App.scss";
function App() {
    const gridRef = useRef(null);
    const [startCell, setStartCell] = useState<Node>();
    const [endCell, setEndCell] = useState<Node>();
    const [grid, setGrid] = useState(createGrid(12, 20));
    const [isDragging, setIsDragging] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    type Node = {
        row: number;
        col: number;
        isWall?: boolean;
        visited?: boolean;
        prevNode?: Node | null;
    };

    type Grid = Node[][];

    /**
     * It initializes the @height x @width grid, and fills it with 0's
     * @param height
     * @param width
     * @returns
     */
    function createGrid(height: number, width: number): Grid {
        return Array.from({ length: height }, (_, i) =>
            Array.from({ length: width }, (_, j) => ({
                row: i,
                col: j,
                visited: false,
                isWall: false,
                prevNode: null,
            }))
        );
    }

    /**
     * It sets a start cell, an end cell, and walls consecutively
     * @param row the row of the cell clicked
     * @param col the column of the cell clicked
     * Updates the grid in case walls are added, by adding a 1 in the cell position.
     */
    function handleClick(row: number, col: number) {
        if (!startCell) {
            setStartCell({ row, col });
        } else if (!endCell) {
            setEndCell({ row, col });
        } else {
            if (startCell.row == row && startCell.col == col) return;
            if (endCell.row == row && endCell.col == col) return;

            // Replace grid, but the cell that was clicked, has the isWall property to the true if a non-wall clicked & viceversa
            const newGrid = grid.map((row) => row.map((node) => ({ ...node })));
            newGrid[row][col].isWall = !newGrid[row][col].isWall;
            setGrid(newGrid);
        }
    }

    /**
     * Allows for adding / removing walls by dragging
     * @param row, @param col both the coordinates of the clicked/dragged cell
     */
    function handleDragging(row: number, col: number) {
        // equal to else part of @handleClick
        if (isDragging && !isAnimating) {
            if (startCell?.row == row && startCell.col == col) return;
            if (endCell?.row == row && endCell.col == col) return;
            const newGrid = grid.map((row) => row.map((node) => ({ ...node })));
            newGrid[row][col].isWall = !newGrid[row][col].isWall;
            setGrid(newGrid);
        }
    }

    /**
     * Changes the class of any node inside the grid, by getting the id "{row}-{col}"
     * @param node the node/cell to change in the grid
     * @param cssClass the class to add to the node/cell
     */
    function updateNodeClass(node: Node, cssClass: "visited" | "path") {
        // Select the node's HTML element in the grid by using its coordinates
        const element = document.getElementById(`${node.row}-${node.col}`);

        // The start and end dont get colored with neither the visited nor the path color
        if ((node.row == startCell?.row && node.col == startCell.col) || (node.row == endCell?.row && node.col == endCell?.col)) return;

        if (!element) return;

        if (cssClass === "visited") {
            element.classList.add("visited");
        } else if (cssClass === "path") {
            element.classList.add("path");
        }
    }

    /**
     * BFS implementation
     * This implementation searches for the neighbors manually, as no adjacency list used
     * Thus it searches in all directions... : (row-1, col) - (row+1,col) - (row,col-1) - (row, col+1)
     * @param grid a grid of nodes : Node[][]
     * @returns an object containing: {visited nodes, whether end is reached}
     */
    function bfs(grid: Grid, start: Node, end: Node): { visited: Node[]; endReached: boolean } {
        //Basic initialization
        const queue: Node[] = [];
        const visitedNodes: Node[] = [];
        queue.push(start);
        start.visited = true;

        // [Row, Column]
        const directions: number[][] = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ];

        // BFS main loop
        while (queue.length > 0) {
            const cur = queue.shift()!;
            visitedNodes.push(cur);

            // If the current node reached the end, returns the visited nodes
            if (cur.row === end.row && cur.col == end.col) {
                return { visited: visitedNodes, endReached: true };
            }

            for (const dir of directions) {
                // shift the current row by the respective directions to get the neighbor (up, left, down, right) -> no diagonal
                const cur_row: number = cur.row + dir[0];
                const cur_col: number = cur.col + dir[1];

                // Check if neighbor does not exceed the grid borders
                // interval_horizontal: [0, grid.length] AND interval_vertical: [0, grid[0].length];
                if (cur_row >= 0 && cur_row < grid.length && cur_col >= 0 && cur_col < grid[0].length) {
                    const neighbor = grid[cur_row][cur_col];
                    // If neighbor is visited or is a wall => ignore (thus only continues with the if if its not a visited neighbor)
                    if (!grid[cur_row][cur_col].visited && !grid[cur_row][cur_col].isWall) {
                        neighbor.visited = true;
                        neighbor.prevNode = cur;
                        queue.push(neighbor);
                    }
                }
            }
        }

        // should be unreachable code, unless no finish node is found (e.g. when start is walled off)
        return { visited: visitedNodes, endReached: false };
    }

    /**
     * Adds the path by repeatedly checking the previous node, starting from the end node of the visitedNodes array
     * @param end
     * @returns a list of nodes representing the path
     */
    function getShortestPath(end: Node): Node[] {
        const path: Node[] = [];
        let cur: Node | null = end;

        while (cur !== null) {
            path.push(cur);
            if (cur.prevNode == null) break;
            cur = cur.prevNode;
        }
        return path.reverse().filter((node) => !node.isWall);
    }

    /**
     * Resets the game by removing all changes, and reseting variables
     */
    function resetGame() {
        setGrid(createGrid(12, 20));
        setStartCell(null!);
        setEndCell(null!);
        setIsAnimating(false);
        const cells = document.querySelectorAll(".cell");
        cells.forEach((cell) => {
            cell.classList.remove("visited");
            cell.classList.remove("wall");
            cell.classList.remove("path");
        });
    }

    /**
     * Runs the BFS and animates the exploration of nodes and the path
     */
    function solve() {
        if (startCell && endCell != undefined) {
            const bfsResult = bfs(grid, startCell, endCell);
            const nodes: Node[] = bfsResult.visited;
            const path = getShortestPath(nodes[nodes.length - 1]);

            setIsAnimating(true);
            for (let i = 0; i < nodes.length; i++) {
                setTimeout(() => {
                    const curNode = nodes[i];
                    updateNodeClass(curNode, "visited");
                }, 35 * i);
            }

            // If end is not reached drawing a path not possible
            if (bfsResult.endReached == false) {
                setTimeout(() => {
                    alert("End is unreachable");
                }, 35 * nodes.length + 50);
                return;
            }

            for (let j = 0; j < path.length; j++) {
                setTimeout(() => {
                    const curNode = path[j];
                    updateNodeClass(curNode, "path");
                }, 50 * j + 35 * nodes.length);
            }
        }
    }
    return (
        <>
            <h2>BFS Visualizer</h2>
            <div
                ref={gridRef}
                className="grid-container"
                onMouseUp={() => setIsDragging(false)}
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}>
                {grid.map((row, i) =>
                    row.map((cell, j) => (
                        <div
                            key={`${i}-${j}`}
                            id={`${i}-${j}`}
                            className={`cell ${cell.isWall ? "wall" : ""} ${startCell && startCell.row === i && startCell.col === j ? "start" : ""} ${
                                endCell && endCell.row === i && endCell.col === j ? "end" : ""
                            }`}
                            onClick={() => handleClick(i, j)}
                            onMouseEnter={() => handleDragging(i, j)}
                        />
                    ))
                )}
            </div>

            <button className="reset-btn" onClick={() => resetGame()}>
                Reset
            </button>
            <button className="solve-btn" onClick={() => solve()}>
                Solve
            </button>
        </>
    );
}

export default App;
