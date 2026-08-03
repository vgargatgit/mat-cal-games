# Student misconception map

| Misconception | Diagnostic interaction | Corrective feedback |
|---|---|---|
| ReLU output equals ReLU derivative | positive value greater than one | Output preserves the value; the local slope is one |
| Zero input has derivative one | exact-zero gate | This implementation declares ReLU′(0)=0 |
| A small positive activation nearly blocks gradient | `z=0.01` hidden neuron | Every positive ReLU lane has local derivative one |
| A dead neuron means its weights are zero | blocked gate | The current backward signal is zero; the parameter value is unchanged until an update |
| The gradient points downhill | Navigator direction choice | The gradient points toward increasing loss; descent subtracts it |
| A smaller learning rate is always safer and therefore best | plateau and bowl | Tiny η can make useful progress impractically slow |
| A large learning rate is simply faster | cliff and overshoot | Curvature can turn a large step into oscillation or divergence |
| A tiny gradient proves a global minimum | plateau/ravine | The gradient describes local slope and may be small on a plateau or at a local minimum |
| Wᵀg is a weight gradient | Boss transformation tray | Wᵀg routes sensitivity to the previous activation |
| An outer product routes the activation gradient | Boss transformation tray | The outer product constructs an object with the weight matrix’s shape |
| ReLU mask belongs after W₁ᵀ | Boss phase III | Apply each local Jacobian in reverse forward order |
| Broadcast backward is identity | shared-bias edge | Contributions from every reuse lane add |
| Backpropagation is a special new rule | final boss phase | It is repeated local Jacobian composition plus parameter-gradient construction |
| Jacobians can be multiplied in traversal order without considering matrix order | Inside Backpropagation accumulated equation | Each newly visited backward Jacobian acts on the left of the product already assembled |
| Vanishing or growing happens all at once | Inside Backpropagation magnitude history | Every local multiplication changes the cumulative gradient; the history exposes the step where its behavior changes |
