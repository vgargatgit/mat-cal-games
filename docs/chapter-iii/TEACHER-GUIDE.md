# Teacher guide

## Suggested sequence

Run Chapter III only after learners can explain numerator-layout Jacobian shape, diagonal element-wise Jacobians, reduction gradients, transpose order, and chain-rule composition. The chapter assumes those ideas and avoids reteaching them.

## ReLU Gatekeeper

| Trial | Interaction | Teaching purpose | Debrief prompt |
|---|---|---|---|
| Read one gate | Pass/block values around zero | ReLU is piecewise and local | “Which value does the gate inspect?” |
| Output is not derivative | Compare forward output with backward derivative | Separate value flow from sensitivity flow | “Why can output 3 have derivative 1?” |
| Guard a chain | Predict survival across serial gates | A zero factor blocks the full path product | “Which local Jacobian erased the path?” |
| Restore the hidden layer | Select all dead neurons | ReLU Jacobian is a diagonal mask | “Does small positive mean nearly blocked?” |

At zero, the arcade explicitly uses ReLU′(0)=0. Discuss that this is an implementation convention at the nondifferentiable point.

## Gradient Descent Navigator

| Landscape | Isolated idea | Useful intervention |
|---|---|---|
| Simple Bowl | subtract the gradient | Ask the learner to try uphill once |
| Narrow Valley | unequal curvature | Compare loss reduction at two η values |
| Steep Cliff | large gradients amplify a step | Predict oscillation before running |
| Plateau | slow progress from a small gradient | Separate “small slope” from “at minimum” |
| Twisting Ravine | gradient is local information | Discuss local versus global minimum |
| Overshooting | stability of η | Find a fast stable range by observation |

The game teaches optimization intuition, not differentiation. Do not turn these rounds into derivative exercises.

## Backpropagation Boss Battle

| Phase | Learner reconstructs | Prior arcade connection |
|---|---|---|
| Loss → output | initial loss gradient | scalar derivative and reduction |
| Output → hidden | W₂ᵀ routing and ∇W₂ outer product | Jacobian Tetris and chain order |
| Hidden → input | ReLU mask, W₁ᵀ routing, ∇W₁ outer product | Diagonal Detective and ReLU Gatekeeper |
| Full chain | loss, transpose products, activation, bias, update | every prior game |

After each transformation, ask the learner to say whether they are routing a gradient to an earlier value or constructing a parameter-shaped gradient. This distinction resolves many transpose and outer-product errors.

## Assessment

A learner is ready to leave the chapter when they can narrate:

1. where the incoming loss gradient begins;
2. why a linear layer uses a transpose when routing backward;
3. how ReLU removes lanes;
4. why a weight gradient is an outer product;
5. why shared broadcast contributions add;
6. how the optimizer uses the resulting parameter gradient.
