"""VAE skeleton for generative urban geometry design."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import torch
from sklearn.preprocessing import StandardScaler
from torch import nn
from torch.utils.data import DataLoader, Dataset


class GeometryDataset(Dataset):
    def __init__(self, matrix: np.ndarray) -> None:
        self.matrix = torch.as_tensor(matrix, dtype=torch.float32)

    def __len__(self) -> int:
        return int(self.matrix.shape[0])

    def __getitem__(self, idx: int) -> torch.Tensor:
        return self.matrix[idx]


class UrbanVAE(nn.Module):
    def __init__(self, input_dim: int, latent_dim: int = 8, hidden_dim: int = 64) -> None:
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
        )
        self.mu_layer = nn.Linear(hidden_dim, latent_dim)
        self.logvar_layer = nn.Linear(hidden_dim, latent_dim)

        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, input_dim),
        )

    def encode(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        h = self.encoder(x)
        return self.mu_layer(h), self.logvar_layer(h)

    def reparameterize(self, mu: torch.Tensor, logvar: torch.Tensor) -> torch.Tensor:
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std

    def decode(self, z: torch.Tensor) -> torch.Tensor:
        return self.decoder(z)

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        mu, logvar = self.encode(x)
        z = self.reparameterize(mu, logvar)
        recon = self.decode(z)
        return recon, mu, logvar


class UrbanDesignGenerator:
    """Trainable VAE wrapper for geometry-conditioned generation."""

    def __init__(
        self,
        latent_dim: int = 8,
        hidden_dim: int = 64,
        beta: float = 1e-3,
        device: str | None = None,
    ) -> None:
        self.latent_dim = latent_dim
        self.hidden_dim = hidden_dim
        self.beta = beta
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))

        self.scaler = StandardScaler()
        self.model: UrbanVAE | None = None
        self.input_dim: int | None = None

    def fit(
        self,
        geometry_matrix: np.ndarray,
        epochs: int = 100,
        batch_size: int = 32,
        learning_rate: float = 1e-3,
    ) -> dict[str, Any]:
        if geometry_matrix.size == 0:
            raise ValueError("Empty geometry matrix. Cannot train VAE.")

        if geometry_matrix.ndim == 1:
            geometry_matrix = geometry_matrix.reshape(-1, 1)

        x = np.asarray(geometry_matrix, dtype=np.float32)
        x_scaled = self.scaler.fit_transform(x)

        self.input_dim = int(x_scaled.shape[1])
        self.model = UrbanVAE(
            input_dim=self.input_dim,
            latent_dim=self.latent_dim,
            hidden_dim=self.hidden_dim,
        ).to(self.device)

        dataset = GeometryDataset(x_scaled)
        loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

        optimizer = torch.optim.Adam(self.model.parameters(), lr=learning_rate)
        history: list[float] = []

        self.model.train()
        for _ in range(epochs):
            running_loss = 0.0
            total = 0

            for batch in loader:
                batch = batch.to(self.device)
                recon, mu, logvar = self.model(batch)

                recon_loss = nn.functional.mse_loss(recon, batch, reduction="mean")
                kl_loss = -0.5 * torch.mean(1 + logvar - mu.pow(2) - logvar.exp())
                loss = recon_loss + self.beta * kl_loss

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

                bsz = batch.shape[0]
                running_loss += float(loss.detach().cpu()) * bsz
                total += bsz

            history.append(running_loss / max(total, 1))

        return {
            "epochs": epochs,
            "final_loss": history[-1] if history else None,
            "history": history,
            "input_dim": self.input_dim,
            "latent_dim": self.latent_dim,
        }

    def generate(
        self,
        num_samples: int = 5,
        boundary_conditions: list[float] | None = None,
    ) -> np.ndarray:
        if self.model is None or self.input_dim is None:
            raise RuntimeError("Generative model is not trained yet.")

        self.model.eval()
        with torch.no_grad():
            if boundary_conditions is not None:
                boundary = np.asarray(boundary_conditions, dtype=np.float32)
                if boundary.ndim != 1 or boundary.shape[0] != self.input_dim:
                    raise ValueError(
                        f"Boundary condition must be a 1D vector of size {self.input_dim}."
                    )

                scaled_boundary = self.scaler.transform(boundary.reshape(1, -1))
                boundary_tensor = torch.as_tensor(scaled_boundary, dtype=torch.float32, device=self.device)
                mu, logvar = self.model.encode(boundary_tensor)
                z = self.model.reparameterize(mu, logvar)
                z = z.repeat(max(num_samples, 1), 1)
            else:
                z = torch.randn(max(num_samples, 1), self.latent_dim, device=self.device)

            generated_scaled = self.model.decode(z).detach().cpu().numpy()
            generated = self.scaler.inverse_transform(generated_scaled)
            return generated

    def reconstruct(self, geometry_vector: list[float] | np.ndarray) -> np.ndarray:
        if self.model is None or self.input_dim is None:
            raise RuntimeError("Generative model is not trained yet.")

        vector = np.asarray(geometry_vector, dtype=np.float32)
        if vector.ndim != 1 or vector.shape[0] != self.input_dim:
            raise ValueError(f"Input geometry vector must be size {self.input_dim}.")

        scaled = self.scaler.transform(vector.reshape(1, -1))
        x = torch.as_tensor(scaled, dtype=torch.float32, device=self.device)

        self.model.eval()
        with torch.no_grad():
            recon, _, _ = self.model(x)
        recon_np = recon.detach().cpu().numpy()
        return self.scaler.inverse_transform(recon_np)[0]

    def save(self, path: str | Path) -> None:
        if self.model is None or self.input_dim is None:
            raise RuntimeError("Cannot save an untrained generative model.")

        payload = {
            "model_state_dict": self.model.state_dict(),
            "input_dim": self.input_dim,
            "latent_dim": self.latent_dim,
            "hidden_dim": self.hidden_dim,
            "beta": self.beta,
            "scaler_mean": self.scaler.mean_,
            "scaler_scale": self.scaler.scale_,
            "scaler_var": self.scaler.var_,
            "scaler_n_features_in": self.scaler.n_features_in_,
        }
        torch.save(payload, path)

    @classmethod
    def load(cls, path: str | Path, device: str | None = None) -> "UrbanDesignGenerator":
        payload = torch.load(path, map_location="cpu")

        instance = cls(
            latent_dim=int(payload["latent_dim"]),
            hidden_dim=int(payload["hidden_dim"]),
            beta=float(payload["beta"]),
            device=device,
        )
        instance.input_dim = int(payload["input_dim"])
        instance.model = UrbanVAE(
            input_dim=instance.input_dim,
            latent_dim=instance.latent_dim,
            hidden_dim=instance.hidden_dim,
        )
        instance.model.load_state_dict(payload["model_state_dict"])
        instance.model.to(instance.device)
        instance.model.eval()

        instance.scaler.mean_ = payload["scaler_mean"]
        instance.scaler.scale_ = payload["scaler_scale"]
        instance.scaler.var_ = payload["scaler_var"]
        instance.scaler.n_features_in_ = int(payload["scaler_n_features_in"])

        return instance
